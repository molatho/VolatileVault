const AWS = require('aws-sdk'); 
const s3Client = new AWS.S3();
const fs = require('fs');
import { Domain } from 'domain';
import getDistributionConfig from './aws-distribution-config';
import CloudProvider from './cloudprovider';
import AWS from 'aws-sdk';

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

export class AWSCustomService implements CloudProvider{
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
    this.domainsObject = new AWS.CloudFront({ 
      accessKeyId, 
      secretAccessKey, 
      region 
    }); 
    this.storageObject = new AWS.S3({ 
      accessKeyId, 
      secretAccessKey, 
      region 
    }); 
  }

  //make sure it the cloudfrontdomain is being returned as string
  public async registerDomain(domainName: string, transferIdAndCount: string): Promise<string> { 
    // Distribution parameters with caching disabled 
    const distributionConfiguration = getDistributionConfig(domainName, transferIdAndCount);
  
    return new Promise<string>((resolve, reject) => {
      this.domainsObject.createDistribution({DistributionConfig: distributionConfiguration}, function(err: AWS.AWSError, data: AWS.CloudFront.CreateDistributionResult) {
        if (err) {
          console.error(err);
          reject(err); // Reject the promise with the error
        } else {
          console.log(`CloudFront domain created: ${data.DomainName}`);
          resolve(data); // Resolve the promise with the domain name
        }
      });
    });
  }

  public async releaseDomain(id: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.domainsObject.deleteDistribution({ Id: id }, function(err: AWS.AWSError, data: AWS.CloudFront.DeleteDistributionResult) {
        if (err) {
          return reject(err);
        }
        console.log(`CloudFront domain deleted: ${id}`);
        resolve(data);
      });
    });
  }

  public async releaseDomains(originId: string): Promise<void> {
    this.listDistributionsByTransferId(originId)
      .then((distributions: DomainRegistrationResult[]) => {
        distributions.forEach((distribution: DomainRegistrationResult) => {
          this.domainsObject.deleteDistribution({ Id: distribution.Id })
            .then((data) => {
              console.log(`CloudFront domain deleted: ${distribution.DomainName}`);
            }).catch((err) => {
              console.error(err);
            });
        });
      })
      .catch((error) => {
        console.error('Error releasing CloudFront domains:', error);
      });
  }

  //creates an S3 bucket
  public async createStorage(bucketName: string, region: string) {

    const params = { 
      Bucket: bucketName, 
      CreateBucketConfiguration: { 
        LocationConstraint: region 
      } 
    }; 
    try { 
      await this.storageObject.createBucket(params).promise(); 
      console.log(`S3 bucket created: ${bucketName}`); 
    } catch (error) { 
      console.error(error); 
      throw error; 
    } 
  }

  public async uploadFilesToS3(fileName: string, buffer: ArrayBuffer) {
    //const fileStream = fs.createReadStream(fileName);
    await s3Client.upload({
      Key: fileName,
      Body: buffer,
    }).promise();
  }

  async listDistributionsByTransferId(transferId: string): Promise<DistributionSummary[]> {
    return new Promise((resolve, reject) => {
      const distributionSummaries: DistributionSummary[] = [];
      let marker: string | undefined = undefined;

      const listDistributionsRecursive = (): void => {
        this.domainsObject.listDistributions({ Marker: marker }, (err: AWS.AWSError, response: AWS.DistributionListResponse) => {
          if (err) {
            console.error('Error listing CloudFront distributions:', err);
            return reject(err);
          }

          marker = response.Marker; //or NextMarker

          const filteredDistributions = response.Items?.filter(distribution => {
            return distribution.Origins.Items.some(origin => origin.Id.includes(transferId));
          }) || [];

          distributionSummaries.push(...filteredDistributions.map(distribution => ({
            Id: distribution.Id,
            Status: distribution.Status as 'Deployed' | 'InProgress',
            // Map other necessary properties here
          })));

          if (marker) {
            listDistributionsRecursive(); // If there's a next marker, keep listing
          } else {
            resolve(distributionSummaries); // No more distributions to list, resolve the promise
          }
        });
      };

      listDistributionsRecursive(); // Start the recursive listing
    });
  }
  // async listDistributionsByOriginId(originId: string): Promise<DomainRegistrationResult[]> {
  //   const distributionSummaries: DomainRegistrationResult[] = [];
  //   let marker: string | undefined = undefined;
  
  //   do {
  //     const response = await this.domainsObject.listDistributions({ Marker: marker }).promise();
  //     marker = response.DistributionList?.NextMarker;
  
  //     // Filter distributions by specific OriginId
  //     const filteredDistributions = response.DistributionList?.Items?.filter((distribution) => {
  //       return distribution.Origins.Items.some((origin) => origin.Id === originId);
  //     }) || [];
  
  //     // Map the filtered distributions to the DistributionSummary interface
  //     distributionSummaries.push(...filteredDistributions.map((distribution) => ({
  //       Id: distribution.Id,
  //       Status: distribution.Status as 'Deployed' | 'InProgress',
  //       // Map other necessary properties here
  //     })));
  //   } while (marker);
  
  //   return distributionSummaries;
  // }

  public async areDistributionsReady(originId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.listDistributionsByTransferId(originId)
        .then((distributions: DomainRegistrationResult[]) => {
          distributions.forEach((distribution: DomainRegistrationResult) => {
              console.log(`Distribution ID: ${distribution.Id} - Status: ${distribution.Status}`);
              if (distribution.Status === 'InProgress') {
                return reject("Still in progress.");
              }
          });
          return resolve();
        })
        .catch((error) => {
          console.error('Error checking CloudFront distributions status:', error);
          return reject(error);
        });
      });
  }

}