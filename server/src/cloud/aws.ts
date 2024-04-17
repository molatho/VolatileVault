import {CloudFront, CreateDistributionCommand, CreateDistributionRequest, DeleteDistributionCommand, DistributionConfig, GetDistributionResult, ListDistributionsCommand,} from '@aws-sdk/client-cloudfront';
import {BucketLifecycleConfiguration, BucketLocationConstraint, CreateBucketCommand, GetObjectCommand, PutBucketLifecycleConfigurationCommand, PutObjectCommand, PutObjectOutput, S3,} from '@aws-sdk/client-s3';
const fs = require('fs');

import getDistributionConfig from './aws-distribution-config';
import CloudProvider from './cloudprovider';
import config from '../config';
import { FileInfo } from '../fs';

//https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cloudfront/
//https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/

export interface DomainRegistrationResult {
  DomainName: string; // The domain name of the CloudFront distribution.
  ETag: string; // The entity tag is a hash of the object.
  Id: string; // The identifier for the distribution.
  InProgressInvalidationBatches: number; // The number of invalidation batches currently in progress.
  LastModifiedTime: Date; // The date and time the distribution was last modified.
  Location: string; // The URI of the distribution.
  Status: 'InProgress' | 'Deployed'; // The status of the distribution.
}

interface DistributionSummary {
  Id: string;
  Status: 'Deployed' | 'InProgress';
  // Add other necessary properties here
}

export class AWSCustomService implements CloudProvider<any> {
  //variables that store the domain name and origin ID
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  
  domainsObject: any;
  storageObject: any;


  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
        
    // Configure CloudFront client 
    this.domainsObject = new CloudFront({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    }); 
    this.storageObject = new S3({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    }); 
  }

  //make sure it the cloudfrontdomain is being returned as string
  public async registerDomain(domainName: string, transferIdAndCount: string): Promise<GetDistributionResult> { 
    // Distribution parameters with caching disabled 
    const config: DistributionConfig = getDistributionConfig(domainName, transferIdAndCount);
    const input: CreateDistributionRequest = { DistributionConfig: config };
    const command = new CreateDistributionCommand(input);
    
    try {
      const data: GetDistributionResult = await this.domainsObject.send(command);
      console.log(`CloudFront domain created: ${data.Distribution?.DomainName}`);
      return data; // Resolve the promise with the command output
    } catch (err) {
      console.error(err);
      throw err; // Throw the error to be handled by the caller
    }
  }

  public async releaseDomain(id: string): Promise<void> {
    const command = new DeleteDistributionCommand({ Id: id });
    try {
      await this.domainsObject.send(command);
      console.log(`CloudFront domain deleted: ${id}`);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  public async releaseDomains(transferId: string): Promise<void> {
    try {
      const distributions = await this.listDistributionsByTransferId(transferId);
      for (const distribution of distributions) {
        const command = new DeleteDistributionCommand({ Id: distribution.Id });
        await this.domainsObject.send(command);
        console.log(`CloudFront domain deleted: ${distribution.Id}`);
      }
    } catch (error) {
      console.error('Error releasing CloudFront domains:', error);
      throw error;
    }
  }

  /**
   * Creates a lifecycle policy to expire the bucket after 24 hours
   * @param transferId
   * @returns PutBucketLifecycleConfigurationCommand
   **/
  public getBucketLifeTimeConfig(transferId: string): PutBucketLifecycleConfigurationCommand {
    const currentDate = new Date();
    currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000); // add 24 hours
    const lifecyclePolicy: BucketLifecycleConfiguration = {
      Rules: [{
        ID: "Expire after certain number of hours",
        Status: "Enabled",
        Expiration: {
          Date: currentDate // Set the day and hour of expiration
        }
      }]
    };
    return new PutBucketLifecycleConfigurationCommand({
      Bucket: transferId,
      LifecycleConfiguration: lifecyclePolicy
    });
  }

  /**
   * Get a presigned URL for a file in a bucket
   * @param transferId
   * @param fileName
   * @returns Promise<string>
   * */
  public async getPresignedUrl(transferId: string, fileName: string): Promise<string> {
    const getObjectParams = {
      Bucket: transferId, // The name of the bucket
      Key: fileName, // The key of the object
    };
    const command = new GetObjectCommand(getObjectParams);
    const url = await this.storageObject.getSignedUrl(command, { expiresIn: config.FILE_EXPIRY * 60 }); // Expire after 60 minutes
    return url
  }

  public async createStorage(bucketName: string, region: string): Promise<void> {
    const command = new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: { LocationConstraint: BucketLocationConstraint[region] },
    });
    const lifecycleConfigCommand: PutBucketLifecycleConfigurationCommand = this.getBucketLifeTimeConfig(bucketName);
  
    try {
      await this.storageObject.send(command);

      await this.storageObject.send(lifecycleConfigCommand);
      console.log(`S3 bucket created: ${bucketName} with policy to expire in ${config.FILE_EXPIRY} hours`);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async uploadFilesToS3(transferId: string, fileName: string, buffer: ArrayBuffer): Promise<FileInfo> {
    //const fileStream = fs.createReadStream(fileName);
    const command = new PutObjectCommand({
      Bucket: transferId,
      Key: fileName,
      Body: new Uint8Array(buffer),
    });
  
    try {
      await this.storageObject.send(command);
      const presignedUrl = await this.getPresignedUrl(transferId, fileName)
      var file: FileInfo = {id: fileName, creationDate: new Date(Date.now()), path: presignedUrl};
      return file;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async listDistributionsByTransferId(transferId: string): Promise<DistributionSummary[]> {
    let distributionSummaries: DistributionSummary[] = [];
    let marker: string | undefined = undefined;

    while (true) {
      const command = new ListDistributionsCommand({ Marker: marker });
      const response = await this.domainsObject.send(command);

      const filteredDistributions = response.DistributionList?.Items?.filter(distribution => {
        return distribution.Origins.Items.some(origin => origin.Id.includes(transferId));
      }) || [];

      distributionSummaries = distributionSummaries.concat(filteredDistributions.map(distribution => ({
        Id: distribution.Id,
        Status: distribution.Status as 'Deployed' | 'InProgress',
        // Map other necessary properties here
      })));

      if (response.DistributionList?.NextMarker) {
        marker = response.DistributionList.NextMarker;
      } else {
        break;
      }
    }

    return distributionSummaries;
  }

  public async areDistributionsReady(originId: string): Promise<boolean> {
    try {
      const distributions = await this.listDistributionsByTransferId(originId);
      if (distributions.length === 0) throw new Error('No distributions found');

      for (const distribution of distributions) {
        if (distribution.Status === 'InProgress') {
          return false;
        }else{
          console.log(`Distribution ID: ${distribution.Id} -  Status: ${distribution.Status}`);
        }
      };
      return true;
    } catch (error) {
      throw error;
    }
  }

}

export const cloudProvider = new AWSCustomService(config.AWS_ACCESS, config.AWS_SECRET, config.AWS_REGION);
