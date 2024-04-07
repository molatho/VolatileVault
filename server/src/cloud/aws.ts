const AWS = require('aws-sdk'); 
const s3Client = new AWS.S3();
const fs = require('fs');

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
  public async registerDomain(domainName: string/*, originId: string*/): Promise<string> { 
    // Distribution parameters with caching disabled 
    const distributionConfiguration = { 
      Aliases: { 
        Quantity: 1, 
        Items: [domainName] 
      }, 
      CallerReference: Date.now().toString(),
      Comment: 'VolatileVault-Cloudfront-Distribution',
      DefaultCacheBehavior: {
        //TargetOriginId: originId,
        ViewerProtocolPolicy: 'allow-all',
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: 'none',
          },
        },
        MinTTL: 0,
        DefaultTTL: 0,
        MaxTTL: 0,
      },
      Enabled: true,
      // CacheBehaviors: [{ 
      //   Paths: { 
      //     Quantity: 1, 
      //     Items: ['/*'] // All paths 
      //   }, 
      //   // TargetOriginId: originId, 
      //   TrustedSigners: { 
      //     Enabled: false // Disable for easier testing 
      //   }, 
      //   // Disable caching 
      //   Caching: 'DISABLED' 
      // }], 
      Origins: [{ 
        DomainName: domainName,
        // OriginId: originId 
      }]
    }; 
  
    try { 
      // Create CloudFront distribution 
      const result = await this.domainsObject.createDistribution(distributionConfiguration).promise(); 
      console.log(`CloudFront domain created without caching: ${result.Distribution.DomainName}`); 
      return String(result.Distribution.DomainName); // Convert the domain name to a string before returning
    } catch (error) { 
      console.error(error); 
      throw error; // Re-throw for handling 
    } 
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