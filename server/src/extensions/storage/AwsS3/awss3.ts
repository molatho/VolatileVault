import { ExtensionItem, StorageAwsS3 } from 'src/config/config';
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
  extends BaseExtension<StorageProviderCapabilities, StorageAwsS3>
  implements StorageProvider
{
  get clientConfig(): ExtensionInfo {
    return {
      name: this.cfg.name,
      type: AwsS3StorageProvider.NAME,
      display_name: this.cfg.display_name,
      description: this.cfg.description,
      info: {
        max_size: this.config.max_size,
        file_expiry: this.config.file_expiry,
      },
    };
  }
  private static NAME: string = 'awss3';
  private logger: winston.Logger;
  private client: S3Wrapper;

  private constructor(cfg: ExtensionItem<StorageAwsS3>) {
    super(cfg.name, ['None'], cfg);
    this.logger = Logger.Instance.createChildLogger(
      `${AwsS3StorageProvider.NAME}:${cfg.name}`
    );
  }

  public static get extension_name(): string {
    return AwsS3StorageProvider.NAME;
  }

  public static create(
    cfg: ExtensionItem<any>
  ): BaseExtension<StorageProviderCapabilities, StorageAwsS3> {
    return new AwsS3StorageProvider(cfg);
  }

  async init(): Promise<void> {
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
