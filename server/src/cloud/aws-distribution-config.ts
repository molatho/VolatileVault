// const distributionConfiguration = { 
//   Aliases: { 
//     Quantity: 1, 
//     Items: [domainName] 
//   }, 
//   CallerReference: Date.now().toString(),
//   Comment: 'VolatileVault-Cloudfront-Distribution',
//   DefaultCacheBehavior: {
//     //TargetOriginId: originId,
//     ViewerProtocolPolicy: 'allow-all',
//     ForwardedValues: {
//       QueryString: false,
//       Cookies: {
//         Forward: 'none',
//       },
//     },
//     MinTTL: 0,
//     DefaultTTL: 0,
//     MaxTTL: 0,
//   },
//   Enabled: true,
//   // CacheBehaviors: [{ 
//   //   Paths: { 
//   //     Quantity: 1, 
//   //     Items: ['/*'] // All paths 
//   //   }, 
//   //   // TargetOriginId: originId, 
//   //   TrustedSigners: { 
//   //     Enabled: false // Disable for easier testing 
//   //   }, 
//   //   // Disable caching 
//   //   Caching: 'DISABLED' 
//   // }], 
//   Origins: [{ 
//     DomainName: domainName,
//     // OriginId: originId 
//   }]
// }; 
const crypto = require('crypto');

function generateRandomOriginId() {
  // Generate a random 16-byte hex string. You can change the byte size to get a different length string.
  const randomId = crypto.randomBytes(16).toString('hex');
  return `origin-${randomId}`;
}

export default function getDistributionConfig (domainName: string, originId: string) {
  // const randomId = generateRandomOriginId();

  const distributionConfiguration = {
    "CallerReference": Date.now().toString(),
    "Comment": "VolatileVault-Cloudfront-Distribution",
    "Aliases": { 
          "Quantity": 1, 
          "Items": [domainName] 
        }, 
    "DefaultRootObject": "index.html",
    "CacheBehaviors": {
      "Quantity": 0
    },
    "Logging": {
      "Enabled": false,
      "IncludeCookies": false,
      "Bucket": "",
      "Prefix": ""
    },
    "PriceClass": "PriceClass_All",
    "Enabled": true,
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": originId,
          "DomainName": domainName,
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": originId,
      "ViewerProtocolPolicy": "allow-all",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": ["HEAD", "GET", "POST"],
        "CachedMethods": {
          "Quantity": 1,
          "Items": ["HEAD"]
        }
      },
      "ForwardedValues": {
        "QueryString": false,
        "Cookies": {
          "Forward": "none"
        },
        "Headers": {
          "Quantity": 0
        },
      },
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "MinTTL": 0,
    },
    "ViewerCertificate": {
      "CloudFrontDefaultCertificate": true
    }
  }
  return distributionConfiguration;
}