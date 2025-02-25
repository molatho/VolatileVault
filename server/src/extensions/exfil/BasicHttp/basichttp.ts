import bodyParser from 'body-parser';
import express, { Express, Request, Response, NextFunction } from 'express';
import { Readable } from 'node:stream';
import winston from 'winston';
import { ExfilBasicHTTP, ExtensionItem, Config } from '../../../config/config';
import {
  BaseExtension,
  ExtensionInfo,
  FileUploadInformation,
} from '../../extension';
import { ExtensionRepository } from '../../repository';
import { Logger } from '../../../logging';
import {
  BinaryData,
  ExfilProvider,
  ExfilProviderCapabilities,
  FileInformation,
} from '../provider';
import nocache from 'nocache';
import { jwt } from '../../../jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import { getAuthRoute } from '../../../routes/auth';

export class BasicHTTPExfilProvider
  extends BaseExtension<ExfilProviderCapabilities, ExfilBasicHTTP>
  implements ExfilProvider
{
  private static NAME: string = 'basichttp';
  private logger: winston.Logger;

  private constructor(cfg: ExtensionItem<ExfilBasicHTTP>) {
    super(cfg.name, ['DownloadSingle', 'UploadSingle'], cfg);
    this.logger = Logger.Instance.createChildLogger(
      `${BasicHTTPExfilProvider.NAME}:${cfg.name}`
    );
  }

  public static get extension_name(): string {
    return BasicHTTPExfilProvider.NAME;
  }

  public static create(
    cfg: ExtensionItem<any>
  ): BaseExtension<ExfilProviderCapabilities, ExfilBasicHTTP> {
    return new BasicHTTPExfilProvider(cfg);
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: this.cfg.name,
      type: BasicHTTPExfilProvider.NAME,
      display_name: this.cfg.display_name,
      description: this.cfg.description,
      info: this.config,
    };
  }

  async init(cfg: Config): Promise<void> {
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

  async installRoutes(backendApp: Express): Promise<void> {
    // Upload
    const uploadRoute = express.Router();

    const app = this.config.server ? express() : backendApp;

    if (this.config.server) {
      app.disable('x-powered-by');
      app.use(nocache());
      app.use(
        bodyParser.urlencoded({
          extended: false,
          limit: `${this.config.max_size}mb`,
        })
      );

      app.use(getAuthRoute());

      app.use(
        '/api',
        jwt.unless({ path: [{ url: '/api/auth', method: 'POST' }] }), // TODO: We shouldn't hardcode the path a second time...
        (
          err: UnauthorizedError,
          req: JWTRequest,
          res: Response,
          next: NextFunction
        ) => {
          if (err || !req.auth?.sub)
            return res.status(401).json({ message: 'Authentication failure' });
          return next();
        }
      );
    }

    uploadRoute.use(
      bodyParser.raw({
        limit: `${this.config.max_size}mb`,
        type: 'application/octet-stream',
      })
    );

    uploadRoute.use((error, req, res, next) => {
      if (error) {
        this.logger.error(JSON.stringify(error));
        this.logger.info(JSON.stringify(this.config));
        return res.status(413).json({ message: 'Data exceeds size limit' });
      }
      next(error);
    });

    uploadRoute.post(
      `/api/${this.instance_name}/upload/:storage`,
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
      `/api/${this.instance_name}/download/:id`,
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

    if (this.config.server) {
      return new Promise((res, rej) => {
        app.listen(this.config.server.port, this.config.server.host, () => {
          this.logger.info(
            `Listening on ${this.config.server.host}:${this.config.server.port}`
          );
          res();
        });
        app.on('error', rej);
      });
    }
  }

  async uploadSingle(
    storageName: string,
    data: BinaryData
  ): Promise<FileUploadInformation> {
    // Validate specified storage
    var storage = ExtensionRepository.getInstance().getStorage(storageName);

    // Store file
    var file = await storage.store(data);
    return {
      id: file.id,
      url: file.url,
    };
  }

  async downloadSingle(info: FileInformation): Promise<BinaryData> {
    const storage = await ExtensionRepository.getInstance().getStorageForFile(
      info.id
    );
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
  uploadChunk(
    transferId: string,
    chunkNo: number,
    data: BinaryData
  ): Promise<FileUploadInformation> {
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
