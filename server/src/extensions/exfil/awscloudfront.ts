import winston from 'winston';
import { BaseExtension, ExtensionInfo } from '../extension';
import {
  ExfilProviderCapabilities,
  ExfilProvider,
  BinaryData,
  FileInformation,
  FileRetrievalInformation,
} from './provider';
import { Logger } from '../../logging';
import { Config, ExfilAwsCloudFront } from '../../config/config';
import { ExtensionRepository } from '../repository';
import { Express } from 'express';
import { CloudFrontWrapper } from './AwsCloudFront/cloudfront';

export class AwsCloudFrontExfilProvider
  extends BaseExtension<ExfilProviderCapabilities>
  implements ExfilProvider
{
  private static NAME: string = 'awscloudfront';
  private logger: winston.Logger;
  private client: CloudFrontWrapper;

  public constructor() {
    super(AwsCloudFrontExfilProvider.NAME, ['DownloadSingle', 'UploadSingle']);
    this.logger = Logger.Instance.createChildLogger('AwsCloudFront');
  }

  get config(): ExfilAwsCloudFront {
    return this.cfg.exfil.awscloudfront;
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: AwsCloudFrontExfilProvider.NAME,
      displayName: 'AWS CloudFront',
      info: this.config,
    };
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      this.logger.debug('Initializing CloudFront client...');

      this.client = new CloudFrontWrapper(
        this.config.accessKeyId,
        this.config.secretAccessKey,
        this.config.region
      );

      this.logger.debug('Validating credentials...');
      if ((await this.client.validateCredentials()) == false) {
        return;
      }

      this.logger.info('Initialized & validated credentials');
      this.register();
    } else {
      this.logger.debug('Config not set');
    }
    return;
  }

  protected register() {
    ExtensionRepository.getInstance().registerExfil(this);
  }

  get hosts(): Promise<string[]> {
    // TODO: List distributions here!
    throw new Error('Method not implemented');
  }

  installRoutes(app: Express): Promise<void> {
    throw new Error('Method not implemented.');
  }

  initChunkUpload(storage: string, info: any): string {
    throw new Error('Method not implemented.');
  }
  initChunkDownload(info: any): string {
    throw new Error('Method not implemented.');
  }
  uploadChunk(
    storage: string,
    data: BinaryData
  ): Promise<FileRetrievalInformation> {
    throw new Error('Method not implemented.');
  }
  downloadChunk(info: FileInformation): BinaryData {
    throw new Error('Method not implemented.');
  }

  uploadSingle(
    storage: string,
    data: BinaryData
  ): Promise<FileRetrievalInformation> {
    throw new Error('Method not supported.');
  }
  downloadSingle(info: FileInformation): Promise<BinaryData> {
    throw new Error('Method not supported.');
  }
  addHost(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  removeHost(host: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
