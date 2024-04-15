import {
  StorageData,
  StorageInformation,
  StorageProvider,
  StorageProviderCapabilities,
} from './provider';
import { BaseExtension, ExtensionInfo } from '../extensions/extension';
import {
  BaseExfil,
  BaseStorage,
  StorageFileSystem,
  Config,
} from '../config/config';
import { FsUtils } from './fs';
import { ExtensionRepository } from '../extensions/repository';
import cron from 'node-cron';

export class FileSystemStorageProvider
  extends BaseExtension<StorageProviderCapabilities>
  implements StorageProvider
{
  get clientConfig(): ExtensionInfo {
    return {
      name: FileSystemStorageProvider.NAME,
      displayName: 'Server Filesystem',
      info: {
        maxSize: this.config.max_size,
        file_expiry: this.config.file_expiry,
      },
    };
  }
  private static NAME: string = 'filesystem';
  private fs: FsUtils;

  public constructor() {
    super(FileSystemStorageProvider.NAME, ['None']);
    this.fs = new FsUtils();
  }
  get config(): StorageFileSystem {
    return this.cfg.storage.filesystem;
  }

  async has(id: string): Promise<boolean> {
    return await this.fs.hasFile(id);
  }

  protected register() {
    ExtensionRepository.getInstance().registerStorage(this);
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;

    if (this.config) {
      await this.fs.init(this.config);
      console.log('FileSystemStorageProvider: initialized');
      this.register();
    } else {
      console.log('FileSystemStorageProvider: config not set');
    }
  }

  async store(data: StorageData): Promise<StorageInformation> {
    const info = await this.fs.putFile(data.stream);
    return {
      creationDate: info.creationDate,
      id: info.id,
    };
  }

  async retrieve(info: StorageInformation): Promise<StorageData> {
    const [stream, size] = await this.fs.getFile(info.id);
    return {
      stream,
      size,
    };
  }

  async remove(info: StorageInformation): Promise<void> {
    await this.fs.removeFile(info.id);
  }

  public override installCron(): Promise<void> {
    cron.schedule('0 * * * * *', () => {
      this.fs.cleanup(1000 * 60 * this.config.file_expiry);
    });
    return Promise.resolve();
  }
}
