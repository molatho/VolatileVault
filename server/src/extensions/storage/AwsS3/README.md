<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - AwsS3 Storage</h1>
  <br/>
</div>

This storage allows Volatile Vault to use AWS S3 buckets for file storage and retrieval.

# Configuration

Example:

```yaml
---
storage:
  - type: awss3
    name: awss3bucket
    display_name: AWS S3 Bucket
    config:
      access_key_id: <changeme>
      secret_access_key: <changeme>
      region: <changeme>
      bucket: <changeme>
      user_arn: arn:aws:iam::<changeme>:user/<changeme>
      max_size: 104857600
      file_expiry: 5
      generate_presigned_urls: true
```

Fields:

- `access_key_id`: AWS IAM access key to use for authentication.
- `secret_access_key`: AWS IAM secret access key to use for authentication.
- `region`: AWS region to use when creating new buckets.
- `bucket`: Name of the bucket to use (or create if non-existant).
- `user_arn`: ARN of the user associated to the above credentials. Used to set permissions on the bucket.
- `max_size`: Maximum allows size of files to store.
- `file_expiry`: Duration (in minutes) after which files will be removed automatically.
- `generate_presigned_urls`: Whether or not to generate presigned URLs (for public download) of uploaded files.

> /!\ Note: In order for the automatic file deletion to work as expected, the bucket used with this extension needs to have specific permissions set to allow VolatileVault to query the "LastModified" field of files. The policy used for this operation can be found [here](./bucketpolicy.json).