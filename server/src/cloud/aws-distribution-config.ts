import { DistributionConfig } from '@aws-sdk/client-cloudfront';

export default function getDistributionConfig (domainName: string, transferIdAndCount: string) {
  //https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront.html#createDistribution-property
  //this config will require https on cloudfront but WILL ONLY CONNECT TO HTTP-SERVER
  const DistributionConfig: DistributionConfig = {
    CallerReference: "volatilevault-"+new Date().toISOString(),
    Comment: "VolatileVault-Cloudfront-Distribution",
    DefaultCacheBehavior: {
      TargetOriginId: transferIdAndCount,
      ViewerProtocolPolicy: "https-only",                     //is responsible for https only on cloudfront
      AllowedMethods: {
        Quantity: 7,
        Items: ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"],
        CachedMethods: {
          Quantity: 2,
          Items: ["HEAD", "GET"]
        }
      },
      Compress: false,
      CachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",  //managed-cachingDisabled
      TrustedSigners: {
        Enabled: false,
        Quantity: 0
      },
    },
    Enabled: true,
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: transferIdAndCount,
          DomainName: domainName,
          CustomOriginConfig: {
            HTTPPort: 1234,                     //responsible for connecting to the backend servers port as we have specified http-only below
            HTTPSPort: 443,
            OriginProtocolPolicy: "http-only",  //needs to be changed later to "https-only"
            OriginReadTimeout: 30,              // docs say you can use but api rejects
            OriginKeepaliveTimeout: 5           // docs say you can use but api rejects
          }
        }
      ]
    },
    Aliases: { 
          Quantity: 0, 
    },
    CacheBehaviors: {
      Quantity: 0
    },
    Logging: {
      Enabled: false,
      IncludeCookies: false,
      Bucket: "",
      Prefix: ""
    },
    PriceClass: "PriceClass_All",
    ViewerCertificate: {
      CloudFrontDefaultCertificate: true
    }
  }
  return DistributionConfig;
}