import bodyParser from 'body-parser';
import express, { Express, Request, Response } from 'express';
import { Readable } from 'node:stream';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import winston from 'winston';
import {
  Config,
  ExfilAwsCloudFront,
  TransferConfig,
} from '../../../config/config';
import { FsUtils } from '../../../fs';
import { Logger } from '../../../logging';
import { readFixedChunks } from '../../../streams';
import {
  BaseExtension,
  ExtensionInfo,
  FileUploadInformation,
} from '../../extension';
import { ExtensionRepository } from '../../repository';
import { CloudFrontWrapper } from './wrapper';
import {
  BinaryData,
  ExfilProvider,
  ExfilProviderCapabilities,
  FileInformation,
} from '../provider';
import cron from 'node-cron';
import MultiStream from 'multistream';
import moment from 'moment';

interface ChunkData {
  chunkId: number;
  fileId: string | null;
  done: boolean;
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
  chunks: ChunkData[];
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
  private staticDownloadIdx: number;
  private staticUploadIdx: number;

  public get max_total_size(): number {
    return this.config.max_total_size ?? 100 * 1024 * 1024; // Default to 100MB
  }

  public get chunk_size(): number {
    return this.config.chunk_size ?? 10 * 1024 * 1024; // Default to 10MB
  }

  public constructor() {
    super(AwsCloudFrontExfilProvider.NAME, [
      'DownloadChunked',
      'UploadChunked',
    ]);
    this.logger = Logger.Instance.createChildLogger('AwsCloudFront');
    this.uploads = [];
    this.downloads = [];
    this.fs = new FsUtils(AwsCloudFrontExfilProvider.NAME);
    this.staticDownloadIdx = 0;
    this.staticUploadIdx = 0;
  }

  get config(): ExfilAwsCloudFront {
    return this.cfg.exfil.awscloudfront;
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: AwsCloudFrontExfilProvider.NAME,
      displayName: 'AWS CloudFront',
      info: {
        max_total_size: this.config.max_total_size,
        chunk_size: this.config.chunk_size,
        upload: {
          mode: this.config.upload.mode,
          hosts: this.config.upload.hosts,
        },
        download: {
          mode: this.config.download.mode,
          hosts: this.config.download.hosts,
        },
      },
    };
  }

  public override async installCron(): Promise<void> {
    cron.schedule('0 * * * * *', () => {
      for (const download of this.downloads)
        download.fs.cleanup(1000 * 60 * this.config.download.max_duration);

      for (const upload of this.uploads)
        upload.fs.cleanup(1000 * 60 * this.config.upload.max_duration);

      const now = moment();
      const expired = (
        transfer: TransferData,
        minutes: number,
        removeHosts: boolean
      ): boolean => {
        const _expired =
          moment.duration(now.diff(moment(transfer.creation))).asMinutes() >=
          minutes;

        if (_expired) {
          this.logger.info(`Removing expired transfer ${transfer.id}`);
          if (removeHosts) this.client.releaseDistributions(transfer.id);
        }
        return _expired;
      };

      this.downloads = this.downloads.filter(
        (download) =>
          !expired(
            download,
            this.config.download.max_duration,
            this.config.download.mode == 'Dynamic'
          )
      );
      this.uploads = this.uploads.filter(
        (upload) =>
          !expired(
            upload,
            this.config.upload.max_duration,
            this.config.upload.mode == 'Dynamic'
          )
      );
    });
    return Promise.resolve();
  }

  private validateTransferConfig(
    config: TransferConfig,
    transfer: 'Download' | 'Upload'
  ): boolean {
    if (config.mode == 'Dynamic' && config.max_dynamic_hosts === undefined) {
      this.logger.error(
        `${transfer} configured as dynamic but no max dynamic hosts set`
      );
      return false;
    }
    if (
      config.mode == 'Static' &&
      (config.hosts === undefined || !config.hosts?.length)
    ) {
      this.logger.error(
        `${transfer} configured as static but no hosts defined`
      );
      return false;
    }
    return true;
  }

  async init(cfg: Config): Promise<void> {
    this.cfg = cfg;
    if (this.config) {
      await this.fs.init(this.config.folder);

      this.logger.debug('Validating configuration...');
      if (
        !this.validateTransferConfig(this.config.download, 'Download') ||
        !this.validateTransferConfig(this.config.upload, 'Upload')
      ) {
        this.state = 'InitializationError';
        return;
      }

      this.logger.debug('Initializing CloudFront client...');
      this.client = new CloudFrontWrapper(
        this.config.access_key_id,
        this.config.secret_access_key,
        this.config.region,
        this.config.distribution_tag,
        this.config.domain
      );

      this.logger.debug('Validating credentials...');

      if ((await this.client.validateCredentials()) == false) {
        this.state = 'InitializationError';
        return;
      }

      this.logger.info('Initialized & validated credentials');
      await this.client.getCachePolicyId();
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
    const staticUploads = this.config.upload.hosts ?? [];
    const staticDownloads = this.config.download.hosts ?? [];
    const assignedUploads = this.uploads.map((u) => u.hosts).flat();
    const assignedDownloads = this.downloads.map((u) => u.hosts).flat();
    return Promise.resolve(
      staticUploads
        .concat(staticDownloads)
        .concat(assignedUploads)
        .concat(assignedDownloads)
    );
  }

  async installRoutes(app: Express): Promise<void> {
    // Kick-off a chunked upload: allocate domains
    const initChunkUpload = express.Router();
    initChunkUpload.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/initupload/:storage/:size`,
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
            chunks: transferData.chunks.length,
            size: size,
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
          const upload = this.uploads.find((t) => t.id === transferId);
          const download = this.downloads.find((t) => t.id === transferId);
          if (!upload && !download)
            throw new Error(`Unknown transfer ${transferId}`);

          const status =
            (upload && this.config.upload.mode == 'Static') ||
            (download && this.config.download.mode == 'Static')
              ? true
              : await this.client.areDistributionsReady(transferId);

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
        limit: this.chunk_size,
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
          this.logger.info(
            `Upload request for ${req.params?.transferId ?? 'n/a'} chunk # ${
              req.params?.chunkNo ?? 'n/a'
            } from ${req.ip}`
          );

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

          return res.json({ message: 'Chunk uploaded', ...result });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(chunkedUpload);

    // Kick-off a chunked download
    const initChunkDownload = express.Router();
    initChunkDownload.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/initdownload/:id`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `InitChunkDownload request for ${req.params?.id ?? 'n/a'} from ${
            req.ip
          }`
        );

        try {
          // Validate file id param
          const id = req.params?.id;
          if (!id) throw new Error('Missing id');

          const transferId = await this.initChunkDownload({ id: id });
          const transferData = this.downloads.find((d) => d.id == transferId);

          return res.json({
            message: 'Initialization successful',
            hosts: transferData.hosts,
            chunks: transferData.chunks.length,
            size: transferData.total_size,
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
    app.use(initChunkDownload);

    // Download a single chunk
    const chunkedDownload = express.Router();
    chunkedDownload.get(
      `/api/${AwsCloudFrontExfilProvider.NAME}/download/:transferId/chunk/:chunkNo`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `Download request for ${req.params?.transferId ?? 'n/a'} chunk # ${
            req.params?.chunkNo ?? 'n/a'
          } from ${req.ip}`
        );

        try {
          const transferId = req.params?.transferId;
          if (!transferId) throw new Error(`Invalid transfer ${transferId}`);
          if (!this.downloads.find((t) => t.id === transferId))
            throw new Error(`Unknown transfer ${transferId}`);

          const chunkNo = parseInt(req.params?.chunkNo);
          if (Number.isNaN(chunkNo))
            throw new Error(`Invalid chunk number ${transferId}`);

          const data = await this.downloadChunk(transferId, chunkNo);

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
    app.use(chunkedDownload);

    const terminateDownload = express.Router();
    terminateDownload.post(
      `/api/${AwsCloudFrontExfilProvider.NAME}/download/terminate/:transferId`,
      async (req: Request, res: Response) => {
        this.logger.info(
          `Termination of ${req.params?.transferId ?? 'n/a'} requested from ${
            req.ip
          }`
        );

        try {
          const transferId = req.params?.transferId;
          if (!transferId) throw new Error(`Invalid transfer ${transferId}`);
          const transfer = this.downloads.find((t) => t.id === transferId);
          if (transfer === undefined)
            throw new Error(`Unknown transfer ${transferId}`);

          if (transfer.chunks.find((c) => !c.done))
            throw new Error(`Unfinished download`);

          // Remove all files from disk
          for (const chunk of transfer.chunks)
            await transfer.fs.removeFile(chunk.fileId);

          // Remove transfer from list
          this.downloads = this.downloads.filter((t) => t.id !== transferId);

          // Release domains
          if (this.config.download.mode == 'Dynamic')
            await this.client.releaseDistributions(transferId);

          return res.json({ message: 'Termination successful' });
        } catch (error) {
          this.logger.error(
            `Error: ${error?.message ?? JSON.stringify(error)}`
          );
          return res.status(400).json({ message: error?.message ?? 'Failure' });
        }
      }
    );
    app.use(terminateDownload);
  }

  async initChunkUpload(storage: string, size: number): Promise<string> {
    const transferId = TRANSFER_IDS.rnd();

    const domains = await this.allocateDomainsForTransfer(
      transferId,
      size,
      'Upload'
    );

    const numChunks = Math.ceil(size / this.chunk_size);

    const transfer = {
      id: transferId,
      hosts: domains,
      chunks: Array.from({ length: numChunks }, (_, key) => {
        return { chunkId: key, fileId: null, done: false };
      }),
      storage: storage,
      total_size: size,
      creation: new Date(Date.now()),
      fs: new FsUtils(`${AwsCloudFrontExfilProvider.NAME}:${transferId}`),
    };

    this.uploads.push(transfer);

    await transfer.fs.init(path.join(this.config.folder, transfer.id));

    return transferId;
  }

  private async allocateDomainsForTransfer(
    transferId: string,
    size: number,
    transfer: 'Upload' | 'Download'
  ): Promise<string[]> {
    const transferConfig =
      transfer == 'Upload' ? this.config.upload : this.config.download;

    const calculatedHosts = Math.ceil(size / this.chunk_size);
    const limit =
      transferConfig.mode == 'Dynamic'
        ? transferConfig.max_dynamic_hosts > 0
          ? transferConfig.max_dynamic_hosts
          : 0
        : transferConfig.hosts.length;
    const numHosts =
      limit > 0 ? Math.min(calculatedHosts, limit) : calculatedHosts;

    if (transferConfig.mode == 'Dynamic') {
      // Dynamically allocate domains
      this.logger.info(
        `Registering ${numHosts} domain(s) for transfer ${transferId}...`
      );
      const hostPromises = Array.from({ length: numHosts }, (_, key) =>
        this.client.registerDomain(`${transferId}-${key}`)
      );
      const domains = (await Promise.all(hostPromises)).map(
        (r) => r.Distribution.DomainName
      );
      this.logger.info(
        `Using allocated domains for transfer ${transferId}: ${domains}`
      );
      return domains;
    } else {
      // Use statically (pre-)allocated domains
      var idx =
        transfer == 'Upload' ? this.staticUploadIdx : this.staticDownloadIdx;
      const domains = Array.from(
        { length: numHosts },
        (_, key) =>
          transferConfig.hosts[(idx + key) % transferConfig.hosts.length]
      );
      if (transfer == 'Upload') this.staticUploadIdx += numHosts;
      else this.staticDownloadIdx += numHosts;
      this.logger.info(
        `Using pre-allocated domains for transfer ${transferId}: ${domains}`
      );
      return domains;
    }
  }

  async uploadChunk(
    transferId: string,
    chunkNo: number,
    data: BinaryData
  ): Promise<FileUploadInformation> {
    const transfer = this.uploads.find((t) => t.id === transferId);
    if (chunkNo < 0 || chunkNo > transfer.chunks.length)
      throw new Error(`Invalid chunk number ${chunkNo}`);

    if (transfer.chunks[chunkNo].done)
      throw new Error(`Chunk ${chunkNo} already uploaded`);

    this.logger.debug(`Saving chunk ${chunkNo} of ${transferId}...`);
    const info = await transfer.fs.putFile(data.stream);
    transfer.chunks[chunkNo].fileId = info.id;
    transfer.chunks[chunkNo].done = true;

    // If there are still missing chunks, return empty file info
    if (transfer.chunks.find((c) => !c.done)) return {};

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

    const multistream = new MultiStream(files.map((f) => f[0]));

    this.logger.debug(
      `Storing combined data of ${transferId} to ${storage.name}...`
    );
    const storageInfo = await storage.store({
      size: files.reduce((sum, file) => sum + file[1], 0),
      stream: multistream,
    });

    this.logger.debug(`Clearing temporary files of ${transferId}...`);
    for (const chunk of transfer.chunks)
      await transfer.fs.removeFile(chunk.fileId);

    this.logger.info(`Transfer ${transferId} completed successfully!`);

    // Close transfer: remove transfer from list & release domains
    this.uploads = this.uploads.filter((t) => t.id == transferId);
    if (this.config.upload.mode == 'Dynamic')
      await this.client.releaseDistributions(transferId);

    // TODO: How do we handle termination date info (for UI) here?
    return { id: storageInfo.id, url: storageInfo.url };
  }

  async initChunkDownload(info: FileInformation): Promise<string> {
    const transferId = TRANSFER_IDS.rnd();
    const storage = await ExtensionRepository.getInstance().getStorageForFile(
      info.id
    );
    var data = await storage.retrieve({ id: info.id });

    const domains = await this.allocateDomainsForTransfer(
      transferId,
      data.size,
      'Download'
    );

    const numChunks = Math.ceil(data.size / this.chunk_size);

    const transfer: DownloadTransferData = {
      total_size: data.size,
      chunks: Array.from({ length: numChunks }, (_, key) => {
        return { chunkId: key, fileId: null, done: false };
      }),
      id: transferId,
      storage: storage.name,
      hosts: domains,
      creation: new Date(Date.now()),
      fs: new FsUtils(`${AwsCloudFrontExfilProvider.NAME}:${transferId}`),
    };

    await transfer.fs.init(path.join(this.config.folder, transferId));

    this.logger.info(`Writing file into ${numChunks} chunk files...`);

    await readFixedChunks(
      data.stream,
      this.chunk_size,
      async (chunk: Buffer, count: number) => {
        const fileInfo = await transfer.fs.putFile(Readable.from(chunk));
        transfer.chunks[count].fileId = fileInfo.id;
        this.logger.debug(
          `Chunk #${count}: ${chunk.length} bytes: ${fileInfo.id}`
        );
      }
    );

    this.downloads.push(transfer);

    return transferId;
  }

  async downloadChunk(
    transferId: string,
    chunkNo: number
  ): Promise<BinaryData> {
    const transfer = this.downloads.find((t) => t.id === transferId);
    const chunk = transfer.chunks.find((c) => c.chunkId == chunkNo);

    if (chunk === undefined) throw new Error(`Chunk ${chunkNo} not found`);

    this.logger.debug(`Saving chunk ${chunkNo} of ${transferId}...`);
    const [stream, size] = await transfer.fs.getFile(chunk.fileId);
    chunk.done = true;

    return { size, stream };
  }

  uploadSingle(
    storage: string,
    data: BinaryData
  ): Promise<FileUploadInformation> {
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
