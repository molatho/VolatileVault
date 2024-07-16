import bodyParser from 'body-parser';
import express, { Express, Request, Response } from 'express';
import { Readable } from 'node:stream';
import winston from 'winston';
import { Config, ExfilBasicHTTP } from '../../config/config';
import { BaseExtension, ExtensionInfo } from '../extension';
import { ExtensionRepository } from '../repository';
import { Logger } from '../../logging';
import { StorageProvider } from '../storage/provider';
import {
  BinaryData,
  ExfilProvider,
  ExfilProviderCapabilities,
  FileInformation,
  FileRetrievalInformation,
} from './provider';

export class BasicHTTPExfilProvider
  extends BaseExtension<ExfilProviderCapabilities>
  implements ExfilProvider
{
  private static NAME: string = 'basichttp';
  private logger: winston.Logger;

  public constructor() {
    super(BasicHTTPExfilProvider.NAME, ['DownloadSingle', 'UploadSingle']);
    this.logger = Logger.Instance.createChildLogger('BasicHTTP');
  }

  get config(): ExfilBasicHTTP {
    return this.cfg.exfil.basichttp;
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: BasicHTTPExfilProvider.NAME,
      displayName: 'Built-in HTTP',
      info: this.config,
    };
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      this.logger.info('Initialized');
      this.register();
      this.state = 'Initialized';
    } else {
      this.logger.debug('Config not set');
      this.state = 'Unconfigured';
    }
  }

  protected register() {
    ExtensionRepository.getInstance().registerExfil(this);
  }

  get hosts(): Promise<string[]> {
    return Promise.resolve(this.config.hosts);
  }

  installRoutes(app: Express): Promise<void> {
    // Upload
    const uploadRoute = express.Router();

    uploadRoute.use(
      bodyParser.raw({
        limit: this.config.max_total_size,
        type: 'application/octet-stream',
      })
    );

    uploadRoute.use((error, req, res, next) => {
      if (error) {
        return res.status(413).json({ message: 'Data exceeds size limit' });
      }
      next(error);
    });

    uploadRoute.post(
      `/api/${BasicHTTPExfilProvider.NAME}/upload/:storage`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `Upload request to ${req.params?.storage ?? 'n/a'} from ${req.ip}`
        );

        try {
          // Validate storage param
          const storageName = req.params?.storage;
          if (!storageName) throw new Error('Missing storage');

          const storage =
            ExtensionRepository.getInstance().getStorage(storageName);

          // Validate body
          const body = req.body as Buffer;
          if (!body || !body.length) throw new Error('Missing body');

          this.logger.debug(`Storing using ${storageName}`);
          const result = await this.uploadSingle(storageName, {
            stream: Readable.from(body),
            size: body.length,
          });

          this.logger.debug('Store successful!');
          res.json({
            ...result,
            message: 'Upload successful',
            lifeTime: storage.config.file_expiry * 1000 * 60,
          });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(uploadRoute);

    // Download
    const downloadRoute = express.Router();
    downloadRoute.use(bodyParser.json());

    downloadRoute.get(
      `/api/${BasicHTTPExfilProvider.NAME}/download/:id`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `Download request for ${req.params?.id ?? 'n/a'} from ${req.ip}`
        );

        try {
          // Validate file id param
          const id = req.params?.id;
          if (!id) throw new Error('Missing id');

          // Acquire data
          const data = await this.downloadSingle({ id: id });

          // Send
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.size.toString(),
          });

          for await (const chunk of data.stream) res.write(chunk, 'binary');

          res.end();
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(downloadRoute);

    return Promise.resolve();
  }

  async uploadSingle(
    storageName: string,
    data: BinaryData
  ): Promise<FileRetrievalInformation> {
    // Validate specified storage
    var storage = ExtensionRepository.getInstance().getStorage(storageName);

    // Store file
    var file = await storage.store(data);
    return {
      id: file.id,
    };
  }

  async downloadSingle(info: FileInformation): Promise<BinaryData> {
    const storage = await ExtensionRepository.getInstance().getStorageForFile(info.id);
    var data = await storage.retrieve({ id: info.id });
    
    return data;
  }

  // Unsupported methods
  initChunkDownload(info: FileInformation): Promise<string> {
    throw new Error('Method not supported.');
  }
  initChunkUpload(storage: string, size: number): Promise<string> {
    throw new Error('Method not supported.');
  }
  uploadChunk(transferId: string, chunkNo: number, data: BinaryData): Promise<FileRetrievalInformation> {
    throw new Error('Method not supported.');
  }
  downloadChunk(transferId: string, chunkNo: number): Promise<BinaryData> {
    throw new Error('Method not supported.');
  }
  addHost(): Promise<string> {
    throw new Error('Method not supported.');
  }
  removeHost(host: string): Promise<void> {
    throw new Error('Method not supported.');
  }
}
