import {
  BucketLocationConstraint,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Logger } from '../../../logging';
import winston from 'winston';
import { Readable } from 'node:stream';
import ShortUniqueId from 'short-unique-id';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import moment from 'moment';
import bucketpolicy from './bucketpolicy.json';

const fileids = new ShortUniqueId({ length: 6, dictionary: 'alpha_upper' });

export class S3Wrapper {
  private client: S3Client;
  private logger: winston.Logger;
  private bucket: string;
  private region: string;
  private lifetime: number;
  private user_arn: string;

  public constructor(
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    bucket: string,
    lifetime: number,
    user_arn: string
  ) {
    this.client = new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      apiVersion: 'latest',
      region,
    });
    this.bucket = bucket;
    this.region = region;
    this.lifetime = lifetime;
    this.user_arn = user_arn;
    this.logger = Logger.Instance.createChildLogger('AwsS3Wrapper');
  }

  public async createBucketIfNotExists(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.debug(`Bucket ${this.bucket} exists!`);
    } catch (error) {
      if (error.name === 'NotFound') {
        this.logger.debug(`Bucket ${this.bucket} does not exist; creating...`);
        await this.createBucket();
        this.logger.debug(`Setting bucket policy...`);
        await this.setBucketPolicy();
        this.logger.info(`Bucket ${this.bucket} created & configured!`);
      } else {
        throw error;
      }
    }
  }

  private async createBucket(): Promise<void> {
    try {
      const command = new CreateBucketCommand({
        Bucket: this.bucket,
        CreateBucketConfiguration: {
          LocationConstraint: BucketLocationConstraint[this.region],
        },
      });
      await this.client.send(command);
      this.logger.info(`Created bucket ${this.bucket}!`);
    } catch (error) {
      this.logger.error(
        `Failed to create bucket: ${error?.name} ${error?.message ?? error}`
      );
      throw error;
    }
  }

  private async setBucketPolicy(): Promise<void> {
    var policy = bucketpolicy;

    policy.Statement[0].Principal.AWS = this.user_arn;
    policy.Statement[0].Resource = `arn:aws:s3:::${this.bucket}/*`;

    const params = {
      Bucket: this.bucket,
      Policy: JSON.stringify(policy),
    };

    const command = new PutBucketPolicyCommand(params);

    try {
      await this.client.send(command);
      this.logger.info(`Configured bucket policy for ${this.bucket}!`);
    } catch (error) {
      this.logger.error(
        `Failed to set bucket policy: ${error?.name} ${error?.message ?? error}`
      );
      throw error;
    }
  }

  public async validateCredentials(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error) {
      if (
        error.name === 'InvalidAccessKeyId' ||
        error.name === 'SignatureDoesNotMatch'
      ) {
        return false;
      } else if (error.name === 'NotFound') {
        return true;
      } else {
        this.logger.error(
          `Failed validating AWS S3 credentials: ${error?.name} ${
            error?.message ?? error
          }`
        );
        throw error;
      }
    }
  }

  public async fileExists(id: string): Promise<boolean> {
    const headObjectParams = {
      Bucket: this.bucket,
      Key: id,
    };
    const command = new HeadObjectCommand(headObjectParams);

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      } else {
        this.logger.error(
          `Failed to query object: ${error?.name} ${error?.message ?? error}`
        );
        throw error;
      }
    }
  }

  public async downloadFile(id: string): Promise<[Readable, number]> {
    const getObjectParams = {
      Bucket: this.bucket,
      Key: id,
    };
    const command = new GetObjectCommand(getObjectParams);

    try {
      const response = await this.client.send(command);
      const body = response.Body as Readable;
      return [body, response.ContentLength];
    } catch (error) {
      this.logger.error(
        `Failed to download file: ${error?.name} ${error?.message ?? error}`
      );
      throw error;
    }
  }

  public async uploadFile(data: Readable): Promise<string> {
    const id = fileids.rnd();

    const uploader = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: id,
        Body: data,
      },
    });

    try {
      await uploader.done();
      return id;
    } catch (error) {
      this.logger.error(
        `Failed to upload file: ${error?.name} ${error?.message ?? error}`
      );
      throw error;
    }
  }

  public async removeFile(id: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: id,
    });

    try {
      await this.client.send(command);
    } catch (error) {
      this.logger.error(
        `Failed to remove file: ${error?.name} ${error?.message ?? error}`
      );
      throw error;
    }
  }

  public async getPresignedUrl(id: string): Promise<string> {
    const getObjectParams = {
      Bucket: this.bucket,
      Key: id,
    };
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.lifetime * 60,
    });
    return url;
  }

  public async deleteOldFiles(): Promise<void> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
    });

    try {
      const listObjectsResponse = await this.client.send(listCommand);
      if (!listObjectsResponse.Contents) return;

      const now = moment();
      const objectsToDelete = listObjectsResponse.Contents.filter((object) => {
        const lastModified = object.LastModified!;
        const ageInMinutes = now.diff(moment(lastModified), 'minutes');
        return ageInMinutes > this.lifetime;
      });

      for (const object of objectsToDelete) {
        this.logger.debug(`Removing expired file ${object.Key}`);
        await this.removeFile(object.Key!);
      }
    } catch (error) {
      this.logger.error(
        `Failed to remove expired files: ${error?.name} ${
          error?.message ?? error
        }`
      );
      throw error;
    }
  }
}
