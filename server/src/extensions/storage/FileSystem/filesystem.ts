import {
  StorageData,
  StorageProvider,
  StorageProviderCapabilities,
} from '../provider';
import {
  BaseExtension,
  ExtensionInfo,
  FileUploadInformation,
} from '../../extension';
import { StorageFileSystem, ExtensionItem, Config } from '../../../config/config';
import { FsUtils } from '../../../fs';
import { ExtensionRepository } from '../../repository';
import cron from 'node-cron';
import winston from 'winston';
import { Logger } from '../../../logging';

export class FileSystemStorageProvider
  extends BaseExtension<StorageProviderCapabilities, StorageFileSystem>
  implements StorageProvider
{
  get clientConfig(): ExtensionInfo {
    return {
      name: this.cfg.name,
      type: FileSystemStorageProvider.NAME,
      display_name: this.cfg.display_name,
      description: this.cfg.description,
      info: {
        max_size: this.config.max_size,
        file_expiry: this.config.file_expiry,
      },
    };
  }
  private static NAME: string = 'filesystem';
  private logger: winston.Logger;
  private fs: FsUtils;

  private constructor(cfg: ExtensionItem<StorageFileSystem>) {
    super(cfg.name, ['None'], cfg);
    this.logger = Logger.Instance.createChildLogger(
      `${FileSystemStorageProvider.NAME}:${cfg.name}`
    );
    this.fs = new FsUtils(`${FileSystemStorageProvider.NAME}:${cfg.name}`);
  }

  public static get extension_name(): string {
    return FileSystemStorageProvider.NAME;
  }

  public static create(
    cfg: ExtensionItem<any>
  ): BaseExtension<StorageProviderCapabilities, StorageFileSystem> {
    return new FileSystemStorageProvider(cfg);
  }

  async has(id: string): Promise<boolean> {
    return await this.fs.hasFile(id);
  }

  protected register() {
    ExtensionRepository.getInstance().registerStorage(this);
  }

  async init(cfg: Config): Promise<void> {
    if (this.config) {
      await this.fs.init(this.config.folder);
      this.logger.info('Initialized');
      this.register();
    } else {
      this.logger.debug('Config not set');
    }
  }

  async store(data: StorageData): Promise<FileUploadInformation> {
    this.logger.debug(`Storing ${data.size} bytes`);
    const info = await this.fs.putFile(data.stream);
    this.logger.debug(`Done: ${info.id}`);
    return {
      creationDate: info.creationDate,
      id: info.id,
    };
  }

  async retrieve(info: FileUploadInformation): Promise<StorageData> {
    const [stream, size] = await this.fs.getFile(info.id);
    return {
      stream,
      size,
    };
  }

  async remove(info: FileUploadInformation): Promise<void> {
    await this.fs.removeFile(info.id);
  }

  public override installCron(): Promise<void> {
    cron.schedule('0 * * * * *', () => {
      this.fs.cleanup(1000 * 60 * this.config.file_expiry);
    });
    return Promise.resolve();
  }
}
