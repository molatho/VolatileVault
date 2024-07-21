import { Config, StorageAwsS3 } from 'src/config/config';
import winston from 'winston';
import { Logger } from '../../../logging';
import {
  BaseExtension,
  ExtensionInfo,
  FileUploadInformation,
} from '../../extension';
import { ExtensionRepository } from '../../repository';
import {
  StorageData,
  StorageProvider,
  StorageProviderCapabilities,
} from '../provider';
import { S3Wrapper } from './wrapper';
import cron from 'node-cron';

export class AwsS3StorageProvider
  extends BaseExtension<StorageProviderCapabilities>
  implements StorageProvider
{
  get clientConfig(): ExtensionInfo {
    return {
      name: AwsS3StorageProvider.NAME,
      displayName: 'AWS S3 Bucket',
      info: {
        max_size: this.config.max_size,
        file_expiry: this.config.file_expiry,
      },
    };
  }
  private static NAME: string = 'awss3';
  private logger: winston.Logger;
  private client: S3Wrapper;

  public constructor() {
    super(AwsS3StorageProvider.NAME, ['None']);
    this.logger = Logger.Instance.createChildLogger('AwsS3');
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      this.logger.debug('Initializing S3 client...');
      this.client = new S3Wrapper(
        this.config.access_key_id,
        this.config.secret_access_key,
        this.config.region,
        this.config.bucket,
        this.config.file_expiry,
        this.config.user_arn
      );

      this.logger.debug('Validating credentials...');
      if ((await this.client.validateCredentials()) == false) {
        this.state = 'InitializationError';
        return;
      }

      await this.client.createBucketIfNotExists();

      this.logger.info('Initialized & validated credentials');
      this.register();
      this.state = 'Initialized';
    } else {
      this.logger.debug('Config not set');
      this.state = 'Unconfigured';
    }
  }

  protected register() {
    ExtensionRepository.getInstance().registerStorage(this);
  }

  get config(): StorageAwsS3 {
    return this.cfg.storage.awss3;
  }

  has(id: string): Promise<boolean> {
    return this.client.fileExists(id);
  }

  async store(data: StorageData): Promise<FileUploadInformation> {
    this.logger.debug(`Uploading ${data.size} bytes`);
    const id = await this.client.uploadFile(data.stream);
    this.logger.debug(`Done: ${id}`);
    var url: string | undefined = undefined;
    if (this.config.generate_presigned_urls)
      url = await this.client.getPresignedUrl(id);

    return {
      id,
      url,
      creationDate: new Date(Date.now()),
    };
  }

  async retrieve(info: FileUploadInformation): Promise<StorageData> {
    const [stream, size] = await this.client.downloadFile(info.id);
    return {
      size,
      stream,
    };
  }

  async remove(info: FileUploadInformation): Promise<void> {
    await this.client.removeFile(info.id);
  }

  public override installCron(): Promise<void> {
    cron.schedule('0 * * * * *', () => this.client.deleteOldFiles());
    return Promise.resolve();
  }
}
