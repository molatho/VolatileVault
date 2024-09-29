import {
  CachePolicySummary,
  CloudFront,
  CreateCachePolicyCommand,
  CreateCachePolicyRequest,
  CreateDistributionCommand,
  CreateDistributionRequest,
  DeleteDistributionCommand,
  DistributionConfig,
  DistributionSummary,
  GetDistributionCommand,
  GetDistributionResult,
  ListCachePoliciesCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { Logger } from '../../../logging';
import winston from 'winston';
import distributionconfig from './distributionconfig.json';

export class CloudFrontWrapper {
  private client: CloudFront;
  private logger: winston.Logger;
  private distributionTag: string;
  private domain: string;
  private cachePolicyId: string;

  public constructor(
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    distributionTag: string,
    domain: string
  ) {
    this.client = new CloudFront({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      apiVersion: 'latest',
      region,
    });
    this.distributionTag = distributionTag;
    this.domain = domain;
    this.logger = Logger.Instance.createChildLogger('AwsCloudFrontWrapper');
  }

  public async validateCredentials(): Promise<boolean> {
    try {
      const res = await this.client.send(
        new ListDistributionsCommand({ MaxItems: 1 })
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed validating AWS CloudFront credentials: ${
          error?.message ?? error
        }`
      );
      return false;
    }
  }

  public async listDistributionsByTransferId(
    transferId: string
  ): Promise<DistributionSummary[]> {
    let distributionSummaries: DistributionSummary[] = [];
    let marker: string | undefined = undefined;

    do {
      const command = new ListDistributionsCommand({ Marker: marker });
      const response = await this.client.send(command);

      const filteredDistributions =
        response.DistributionList?.Items?.filter((distribution) => {
          return distribution.Origins.Items.some((origin) =>
            origin.Id.includes(transferId)
          );
        }) || [];

      distributionSummaries.push(...filteredDistributions);

      marker = response.DistributionList.NextMarker;
    } while (marker);

    return distributionSummaries;
  }

  public async getCachePolicyId(): Promise<void> {
    this.cachePolicyId = await this.getOrCreateCachePolicy();
  }

  private async getOrCreateCachePolicy(): Promise<string> {
    const policyName = 'VolatileVault-IncludeAuthorizationHeaderPolicy';

    // Check if the cache policy already exists
    const existingPolicyId = await this.findCachePolicyIdByName(policyName);
    if (existingPolicyId) {
      return existingPolicyId;
    }

    // Create a new cache policy
    const policyConfig: CreateCachePolicyRequest = {
      CachePolicyConfig: {
        Name: policyName,
        DefaultTTL: 86400, // One day
        MaxTTL: 31536000, // One year
        MinTTL: 0,
        ParametersInCacheKeyAndForwardedToOrigin: {
          EnableAcceptEncodingBrotli: true,
          EnableAcceptEncodingGzip: true,
          HeadersConfig: {
            HeaderBehavior: 'whitelist',
            Headers: {
              Quantity: 1,
              Items: ['Authorization'],
            },
          },
          CookiesConfig: {
            CookieBehavior: 'none', 
          },
          QueryStringsConfig: {
            QueryStringBehavior: 'none',
          },
        }, 
      },
    };

    const command = new CreateCachePolicyCommand(policyConfig);
    const response = await this.client.send(command);

    return response.CachePolicy?.Id!;
  }

  private async findCachePolicyIdByName(
    policyName: string
  ): Promise<string | undefined> {
    const command = new ListCachePoliciesCommand({});
    const response = await this.client.send(command);

    const policy = response.CachePolicyList?.Items?.find(
      (item: CachePolicySummary) =>
        item.CachePolicy?.CachePolicyConfig?.Name === policyName
    );
    return policy?.CachePolicy?.Id;
  }

  public async releaseDistributions(transferId: string): Promise<void> {
    try {
      const distributions = await this.listDistributionsByTransferId(
        transferId
      );
      for (const distribution of distributions) {
        this.releaseDomain(distribution.Id);
      }
    } catch (error) {
      // TODO: Catch ratelimiting error and retry automatically after waiting
      this.logger.error(
        `Error releasing CloudFront domains: ${error?.message ?? error}`
      );
      throw error;
    }
  }

  public async areDistributionsReady(transferId: string): Promise<boolean> {
    try {
      const distributions = await this.listDistributionsByTransferId(
        transferId
      );
      if (distributions.length === 0) throw new Error('No distributions found');

      for (const distribution of distributions) {
        if (distribution.Status !== 'Deployed') {
          return false;
        }
      }
      return true;
    } catch (error) {
      throw error;
    }
  }

  public async registerDomain(
    transferIdAndCount: string
  ): Promise<GetDistributionResult> {
    const config = this.getDistributionConfig(transferIdAndCount);
    const input: CreateDistributionRequest = { DistributionConfig: config };
    const command = new CreateDistributionCommand(input);

    try {
      const data: GetDistributionResult = await this.client.send(command);
      this.logger.info(`Domain created: ${data.Distribution?.DomainName}`);
      return data;
    } catch (error) {
      this.logger.error(
        `Failed registering domain: ${error?.message ?? error}`
      );
      throw error?.message ?? error;
    }
  }

  public async releaseDomain(id: string): Promise<void> {
    // Get the current distribution config
    const getDistCommand = new GetDistributionCommand({ Id: id });
    const getDistResponse = await this.client.send(getDistCommand);

    if (getDistResponse.Distribution.DistributionConfig.Enabled) {
      // Update the distribution to disable it
      const updateDistCommand = new UpdateDistributionCommand({
        Id: id,
        IfMatch: getDistResponse.ETag, // Use the ETag from the get operation
        DistributionConfig: {
          ...getDistResponse.Distribution.DistributionConfig,
          Enabled: false, // Disable the distribution
        },
      });
      await this.client.send(updateDistCommand);
      this.logger.debug(`CloudFront distribution disabled: ${id}`);
    }

    // Wait until the distribution is fully disabled and the status is 'Deployed'
    const latestEtag = await this.waitForDistributionDeployed(
      id,
      getDistResponse.ETag
    );

    // Once disabled, delete the distribution
    const deleteCommand = new DeleteDistributionCommand({
      Id: id,
      IfMatch: latestEtag, // Use the latest ETag from the waitForDistributionDeployed function
    });
    await this.client.send(deleteCommand);
    this.logger.info(`CloudFront distribution deleted: ${id}`);
    //TODO: delete only 6 domains at a time with a delay of a second to not run in to rate limiting
  }

  private async waitForDistributionDeployed(
    distributionId: string,
    etag: string
  ): Promise<string> {
    // Helper function to wait for a specified number of milliseconds
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const command = new GetDistributionCommand({ Id: distributionId });

    let status = '';
    do {
      this.logger.debug(
        `Waiting 30s for distribution ${distributionId} to finish deployment...`
      );
      await delay(30000); // 30 seconds

      // Retrieve the distribution information
      const response = await this.client.send(command);
      status = response.Distribution.Status;

      // Check if the ETag has changed and use the latest one
      if (response.ETag !== etag) {
        etag = response.ETag;
      }
    } while (status !== 'Deployed');

    // Make sure to return the latest ETag to use for the delete operation
    return etag;
  }

  private getDistributionConfig(
    transferIdAndCount: string
  ): DistributionConfig {
    var cfg = structuredClone(distributionconfig) as DistributionConfig;

    cfg.CallerReference =
      cfg.CallerReference = `[VolatileVault] ${this.distributionTag} ${transferIdAndCount};`;
    cfg.DefaultCacheBehavior.TargetOriginId = transferIdAndCount;
    cfg.Origins.Items[0].DomainName = this.domain;
    cfg.Origins.Items[0].Id = transferIdAndCount;
    cfg.DefaultCacheBehavior.CachePolicyId = this.cachePolicyId;

    return cfg;
  }
}
