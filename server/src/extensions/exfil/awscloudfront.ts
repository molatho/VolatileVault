import bodyParser from 'body-parser';
import express, { Express, Request, Response } from 'express';
import { Readable } from 'node:stream';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import winston from 'winston';
import { Config, ExfilAwsCloudFront } from '../../config/config';
import { FsUtils } from '../../fs';
import { Logger } from '../../logging';
import { MultiReadable } from '../../streams';
import { BaseExtension, ExtensionInfo } from '../extension';
import { ExtensionRepository } from '../repository';
import { CloudFrontWrapper } from './AwsCloudFront/cloudfront';
import {
  BinaryData,
  ExfilProvider,
  ExfilProviderCapabilities,
  FileInformation,
  FileRetrievalInformation,
} from './provider';

interface ChunkData {
  chunkId: number;
  fileId: string | null;
}
interface TransferData {
  id: string;
  total_size: number;
  storage: string;
  hosts: string[];
  creation: Date;
  fs: FsUtils;
}

interface DownloadTransferData extends TransferData {
  total_chunks: number;
}

interface UploadTransferData extends TransferData {
  chunks: ChunkData[];
}

const TRANSFER_IDS = new ShortUniqueId({
  length: 16,
  dictionary: 'alpha_upper',
});

export class AwsCloudFrontExfilProvider
  extends BaseExtension<ExfilProviderCapabilities>
  implements ExfilProvider
{
  private static NAME: string = 'awscloudfront';
  private logger: winston.Logger;
  private client: CloudFrontWrapper;
  private uploads: UploadTransferData[];
  private downloads: DownloadTransferData[];
  private fs: FsUtils;

  public get max_total_size(): number {
    return this.config.max_total_size ?? 100 * 1024 * 1024; // Default to 100MB
  }

  public get max_chunk_size(): number {
    return this.config.max_chunk_size ?? 10 * 1024 * 1024; // Default to 10MB
  }

  public constructor() {
    super(AwsCloudFrontExfilProvider.NAME, [
      'DownloadChunked',
      'UploadChunked',
    ]);
    this.logger = Logger.Instance.createChildLogger('AwsCloudFront');
    this.uploads = [];
    this.fs = new FsUtils();
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

  public override async installCron(): Promise<void> {
    return; // TODO: periodically check transfer's creation dates and terminate them if they're too old
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      await this.fs.init(this.config.folder);

      this.logger.debug('Initializing CloudFront client...');

      this.client = new CloudFrontWrapper(
        this.config.access_key_id,
        this.config.secret_access_key,
        this.config.region,
        this.config.distribution_tag,
        this.config.domain
      );

      this.logger.debug('Validating credentials...');
      // TODO: Add check back in; temporarily disabled to avoid spamming API
      // if (
      //   (await this.client.validateCredentials()) == false
      // ) {
      //   this.state = 'InitializationError';
      //   return;
      // }

      this.logger.info('Initialized & validated credentials');
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
    // TODO: List distributions here!
    throw new Error('Method not implemented');
  }

  async installRoutes(app: Express): Promise<void> {
    // Add Host
    /*const addHost = express.Router();
    addHost.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/addHost`,
      async (req: Request, res: Response) => {
        this.logger.info(`Request to add host from ${req.ip}`);

        try {
          const host = await this.addHost();
          return res.json({ message: host });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );

    // Remove Host
    const removeHost = express.Router();
    removeHost.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/removeHost`,
      async (req: Request, res: Response) => {
        const host = req.params?.host;
        if (!host) return res.status(400).json({ message: 'Missing host' });

        this.logger.info(`Request to remove host ${host} from ${req.ip}`);

        try {
          await this.removeHost(host);
          return res.json({ message: host });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );*/

    // Kick-off a chunked upload: allocate domains
    const initChunkUpload = express.Router();
    initChunkUpload.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/initChunk/:storage/:size`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `InitChunkUpload request to ${req.params?.storage ?? 'n/a'} for ${
            req.params?.size ?? 'n/a'
          } bytes from ${req.ip}`
        );

        try {
          // Validate storage param
          const storageName = req.params?.storage;
          if (!storageName) throw new Error('Missing storage');

          const size = parseInt(req.params?.size);
          if (Number.isNaN(size) || size <= 0) throw new Error('Invalid size');
          if (size > this.max_total_size)
            throw new Error('Maximum file size exceeded');

          // Validate that storage exists
          const storage =
            ExtensionRepository.getInstance().getStorage(storageName);
          const transferId = await this.initChunkUpload(storageName, size);
          const transferData = this.uploads.find((t) => t.id === transferId);

          return res.json({
            message: 'Initialization successful',
            hosts: transferData.hosts,
            chunks: transferData.chunks,
            id: transferData.id,
          });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(initChunkUpload);

    // Get deployment status of domains used for specific transfer
    const transferStatus = express.Router();
    transferStatus.get(
      `/api/${AwsCloudFrontExfilProvider.NAME}/status/:transferId`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `Transfer status request for ${
            req.params?.transferId ?? 'n/a'
          } from ${req.ip}`
        );

        try {
          // Validate param
          const transferId = req.params?.transferId;
          if (!transferId) throw new Error(`Invalid transfer ${transferId}`);
          if (
            !this.uploads.find((t) => t.id === transferId) &&
            !this.downloads.find((t) => t.id === transferId)
          )
            throw new Error(`Unknown transfer ${transferId}`);

          const status = await this.client.areDistributionsReady(transferId);

          return res.json({ message: 'Request successful', status });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(transferStatus);

    // Upload a single chunk
    const chunkedUpload = express.Router();
    chunkedUpload.use(
      bodyParser.raw({
        limit: this.config.max_chunk_size,
        type: 'application/octet-stream',
      })
    );

    chunkedUpload.use((error, req, res, next) => {
      if (error) {
        return res.status(413).json({ message: 'Data exceeds size limit' });
      }
      next(error);
    });

    chunkedUpload.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/upload/:transferId/chunk/:chunkNo`,
      async (req: Request, res: Response) => {
        try {
          const body = req.body as Buffer;
          if (!body || !body.length) throw new Error('Missing body');

          const transferId = req.params?.transferId;
          if (!transferId) throw new Error(`Invalid transfer ${transferId}`);
          if (!this.uploads.find((t) => t.id === transferId))
            throw new Error(`Unknown transfer ${transferId}`);

          const chunkNo = parseInt(req.params?.chunkNo);
          if (Number.isNaN(chunkNo))
            throw new Error(`Invalid chunk number ${transferId}`);

          const result = await this.uploadChunk(transferId, chunkNo, {
            stream: Readable.from(body),
            size: body.length,
          });

          return res.json({ message: 'Chunk uploaded', id: result.id });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );

    // Kick-off a chunked download
  }

  async initChunkUpload(storage: string, size: number): Promise<string> {
    const transferId = TRANSFER_IDS.rnd();

    const numHosts = Math.ceil(size / this.max_chunk_size);
    this.logger.info(`Registering ${numHosts} domain(s)...`);
    const hostPromises = Array.from({ length: numHosts }, (_, key) =>
      this.client.registerDomain(`${transferId}-${key}`)
    );
    const results = await Promise.all(hostPromises);

    const transfer = {
      id: transferId,
      hosts: results.map((r) => r.Distribution.DomainName),
      chunks: Array.from({ length: numHosts }, (_, key) => {
        return { chunkId: key, fileId: null };
      }),
      storage: storage,
      total_size: size,
      creation: new Date(Date.now()),
      fs: new FsUtils(),
    };

    this.uploads.push(transfer);

    await transfer.fs.init(path.join(this.config.folder, transfer.id));

    return transferId;
  }

  async uploadChunk(
    transferId: string,
    chunkNo: number,
    data: BinaryData
  ): Promise<FileRetrievalInformation> {
    const transfer = this.uploads.find((t) => t.id === transferId);
    if (chunkNo < 0 || chunkNo > transfer.chunks.length)
      throw new Error(`Invalid chunk number ${chunkNo}`);

    if (transfer.chunks[chunkNo].fileId !== null)
      throw new Error(`Chunk ${chunkNo} already uploaded`);

    this.logger.debug(`Saving chunk ${chunkNo} of ${transferId}...`);
    const info = await transfer.fs.putFile(data.stream);
    transfer.chunks[chunkNo].fileId = info.id;

    // If there are still missing chunks, return empty file info
    if (transfer.chunks.find((c) => c.fileId === null)) return {};

    // Else, assemble file and move to storage
    const storage = ExtensionRepository.getInstance().getStorage(
      transfer.storage
    );

    this.logger.debug(`Retrieving all files of ${transferId}...`);
    const files = await Promise.all(
      transfer.chunks.map(async (c) => {
        const fileInfo = await transfer.fs.getFile(c.fileId);
        return fileInfo;
      })
    );

    const multistream = new MultiReadable(files.map((f) => f[0]));

    this.logger.debug(
      `Storing combined data of ${transferId} to ${storage}...`
    );
    const storageInfo = await storage.store({
      size: files.reduce((sum, file) => sum + file[1], 0),
      stream: multistream,
    });

    this.logger.debug(`Clearing temporary files of ${transferId}...`);
    for (const chunk of transfer.chunks)
      await transfer.fs.removeFile(chunk.fileId);

    this.logger.info(`Transfer ${transferId} completed successfully!`);

    // TODO: How do we handle termination date info here?
    return { id: storageInfo.id };
  }

  async initChunkDownload(info: any): Promise<string> {
    throw new Error('Method not implemented.');
  }

  downloadChunk(transferId: string, chunkNo: number): Promise<BinaryData> {
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
