const crypto = require('crypto');

export default function getDistributionConfig (domainName: string, transferIdAndCount: string) {
  //this config will require https on cloudfront but WILL ONLY CONNECT TO HTTP-SERVER
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
          "Id": transferIdAndCount,
          "DomainName": domainName,
          "CustomOriginConfig": {
            "HTTPPort": 1234, //responsible for connecting to the backend servers port as we have specified http-only below
            "HTTPSPort": 443,
            "OriginProtocolPolicy": "http-only", //needs to be changed later to "https-only"
            "OriginReadTimeout": 30,
            "OriginKeepaliveTimeout": 5
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": transferIdAndCount,
      "ViewerProtocolPolicy": "https-only", //is responsible for https only on cloudfront
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
      "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", //managed-cachingDisabled
    },
    "ViewerCertificate": {
      "CloudFrontDefaultCertificate": true
    }
  }
  return distributionConfiguration;
}