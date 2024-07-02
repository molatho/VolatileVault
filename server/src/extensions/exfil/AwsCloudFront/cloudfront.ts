import {
  CloudFront,
  DistributionSummary,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront';
import winston from 'winston';

export class CloudFrontWrapper {
  private client: CloudFront;
  private logger: winston.Logger;

  public constructor(accessKeyId, secretAccessKey, region) {
    this.client = new CloudFront({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      apiVersion: 'latest',
      region,
    });
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

    while (true) {
      const command = new ListDistributionsCommand({ Marker: marker });
      const response = await this.client.send(command);

      const filteredDistributions =
        response.DistributionList?.Items?.filter((distribution) => {
          return distribution.Origins.Items.some((origin) =>
            origin.Id.includes(transferId)
          );
        }) || [];

    //   distributionSummaries = distributionSummaries.concat(
    //     filteredDistributions.map((distribution) => ({
    //       Id: distribution.Id,
    //       Status: distribution.Status as 'Deployed' | 'InProgress',
    //       // Map other necessary properties here
    //     }))
    //   );

      if (response.DistributionList?.NextMarker) {
        marker = response.DistributionList.NextMarker;
      } else {
        break;
      }
    }

    return distributionSummaries;
  }

  public async releaseDistributions(transferId: string): Promise<void> {
    try {
      const distributions = await this.listDistributionsByTransferId(
        transferId
      );
      for (const distribution of distributions) {
        //this.releaseDomain(distribution.Id);
      }
    } catch (error) {
      console.error('Error releasing CloudFront domains:', error);
      throw error;
    }
  }
}
