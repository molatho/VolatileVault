const AWS = require('aws-sdk'); 
const s3Client = new AWS.S3();
const fs = require('fs');
import getDistributionConfig from './aws-distribution-config';
import CloudProvider from './cloudprovider';

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
  public async registerDomain(domainName: string, originId: string): Promise<string> { 
    // Distribution parameters with caching disabled 
    const distributionConfiguration = getDistributionConfig(domainName, originId);
  
    return new Promise<string>((resolve, reject) => {
      this.domainsObject.createDistribution({DistributionConfig: distributionConfiguration}, function(err, data) {
        if (err) {
          console.error(err);
          reject(err); // Reject the promise with the error
        } else {
          console.log(`CloudFront domain created without caching: ${data.Distribution.DomainName}`);
          resolve(String(data.Distribution.DomainName)); // Resolve the promise with the domain name
        }
      });
    });
  } 

  //create a function that creates an S3 bucket
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
}