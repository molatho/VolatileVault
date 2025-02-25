<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - AwsCloundFront Exfil</h1>
  <br/>
</div>

This exfil allows Volatile Vault to use AWS CloudFront distributions for proxying chunks of data transfers.

# Configuration

Example:

```yaml
---
exfil:
  - type: awscloudfront
    name: cloudfront
    display_name: AWS Cloudfront Distributions
    config:
      access_key_id: '<changeme>'
      secret_access_key: '<changeme>'
      region: '<changeme>'
      distribution_tag: 'volatilevault'
      domain: my.cool.site
      folder: './files_aws'
      chunk_size: 10
      max_size: 100
      upload:
        mode: 'Static'
        max_duration: 5
        hosts:
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
          - '<dunno>.cloudfront.net'
      download:
        mode: 'Dynamic'
        max_duration: 15
        max_dynamic_hosts: 10
```

Fields:

- `access_key_id`: AWS IAM access key to use for authentication.
- `secret_access_key`: AWS IAM secret access key to use for authentication.
- `region`: AWS region to use when registering new distributions.
- `distribution_tag`: Tag to apply to distributions so they can be associated with this VV instance.
- `domain`: Target domain to proxy traffic to - your VV server should run here.
- `folder`: Absolute or relative path to a folder to temporarily store chunks for uploads/downloads in.
- `chunk_size`: Maximum amount of MB transferred per chunk. Used to calculate the number of distributions to register (in `Dynamic` mode). Example: `chunk_size: 10` will result in `5` distributions being spawned when uploading a file of `45` MB.
- `max_size`: Maximum allowed size of a single data transfer (upload or download) in MB.
- `upload`/`download`: Configuration for file uploads and downloads, respectively:
  - `mode`: Either `Dynamic` or `Static`
    - `Dynamic`: AWS CloudFront distributions are registered and deployed dynamically. While this supplies you with fresh distributions for each file transfer, it can take some time for them to deploy. Requires you to specify `max_duration`.
    - `Static`: Predefined AWS CloudFront distributions are used for proxying data transfers. In this mode you will re-use the predefined distributions but they're instantly available. Requires you to specify `hosts`.
  - `max_duration`: Maximum duration (in minutes) that initialized transfers may take to complete before their temporary files are removed.
  - `max_dynamic_hosts`: Maximum number of distributions to register for a single transfer. Set to `0` to ignore this parameter and register distributions solely based on the size of the data being transferred (see `chunk_size`).
  - `hosts`: List of pre-registered and deployed AWS CloudFront distributions to use in `Static` mode.
