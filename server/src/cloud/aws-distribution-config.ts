const crypto = require('crypto');

function generateRandomOriginId() {
  // Generate a random 16-byte hex string. You can change the byte size to get a different length string.
  const randomId = crypto.randomBytes(16).toString('hex');
  return `origin-${randomId}`;
}

export default function getDistributionConfig (domainName: string, originId: string) {
  // const randomId = generateRandomOriginId();

  const distributionConfiguration = {
    "CallerReference": "volatilevault-"+Date.now().toString(),
    "Comment": "VolatileVault-Cloudfront-Distribution",
    "Aliases": { 
          "Quantity": 0, 
        }, 
    "DefaultRootObject": "",
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
          "CustomOriginConfig": {
            "HTTPPort": 80,
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "match-viewer",
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": originId,
      "ViewerProtocolPolicy": "allow-all",
      "AllowedMethods": {
        "Quantity": 7,
        "Items": ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"],
        "CachedMethods": {
          "Quantity": 3,
          "Items": ["HEAD", "GET", "OPTIONS"]
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