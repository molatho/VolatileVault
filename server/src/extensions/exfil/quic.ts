import { Express } from 'express';
import winston from 'winston';
import { Config, ExfilQuic } from '../../config/config';
import { BaseExtension, ExtensionInfo } from '../extension';
import { ExtensionRepository } from '../repository';
import { Logger } from '../../logging';
import {
  BinaryData,
  ExfilProvider,
  ExfilProviderCapabilities,
  FileInformation,
  FileRetrievalInformation,
} from './provider';

export class QuicExfilProvider
  extends BaseExtension<ExfilProviderCapabilities>
  implements ExfilProvider
{
  private static NAME: string = 'quic';
  private logger: winston.Logger;

  public constructor() {
    super(QuicExfilProvider.NAME, ['DownloadSingle', 'UploadSingle']);
    this.logger = Logger.Instance.createChildLogger('Quic');
  }

  get config(): ExfilQuic {
    return this.cfg.exfil.quic;
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: QuicExfilProvider.NAME,
      displayName: 'Quic',
      info: this.config,
    };
  }

  init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      if (!this.cfg.exfil.basichttp){
        this.logger.error('BasicHTTP not set'); 
        return Promise.reject('BasicHTTP not set'); 
      }
      this.logger.info('Initialized');
      this.register();
    } else {
      this.logger.debug('Config not set');
    }
    return Promise.resolve();
  }

  protected register() {
    ExtensionRepository.getInstance().registerExfil(this);
  }

  get hosts(): Promise<string[]> {
    return Promise.resolve(this.config.hosts);
  }

  installRoutes(app: Express): Promise<void> {
    return Promise.resolve();
  }


  // Unsupported methods
  async uploadSingle(
    storageName: string,
    data: BinaryData
  ): Promise<FileRetrievalInformation> {
    throw new Error('Method not supported.');
  }
  async downloadSingle(info: FileInformation): Promise<BinaryData> {
    throw new Error('Method not supported.');
  }
  initChunkUpload(storage: string, size: number): Promise<string> {
    throw new Error('Method not implemented.');
  }
  initChunkDownload(info: FileInformation): Promise<string> {
    throw new Error('Method not implemented.');
  }
  uploadChunk(transferId: string, chunkNo: number, data: BinaryData): Promise<FileRetrievalInformation> {
    throw new Error('Method not implemented.');
  }
  downloadChunk(transferId: string, chunkNo: number): Promise<BinaryData> {
    throw new Error('Method not implemented.');
  }
  addHost(): Promise<string> {
    throw new Error('Method not supported.');
  }
  removeHost(host: string): Promise<void> {
    throw new Error('Method not supported.');
  }
}
