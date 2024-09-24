import winston from 'winston';
import {
  ExfilQuic,
  ExtensionItem,
  Config,
  ExfilBasicHTTP,
} from '../../../config/config';
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
import { Express } from 'express';
import * as child from 'child_process';
import path from 'path';

export class QuicExfilProvider
  extends BaseExtension<ExfilProviderCapabilities, ExfilQuic>
  implements ExfilProvider
{
  private static NAME: string = 'quic';
  private logger: winston.Logger;

  private constructor(cfg: ExtensionItem<ExfilQuic>) {
    super(cfg.name, ['DownloadSingle', 'UploadSingle'], cfg);
    this.logger = Logger.Instance.createChildLogger(
      `${QuicExfilProvider.NAME}:${cfg.name}`
    );
  }

  public static get extension_name(): string {
    return QuicExfilProvider.NAME;
  }

  public static create(
    cfg: ExtensionItem<any>
  ): BaseExtension<ExfilProviderCapabilities, ExfilQuic> {
    return new QuicExfilProvider(cfg);
  }

  get clientConfig(): ExtensionInfo {
    return {
      name: this.cfg.name,
      type: QuicExfilProvider.NAME,
      display_name: this.cfg.display_name,
      description: this.cfg.description,
      info: {
        hosts: this.config.hosts,
      }
    };
  }

  async init(cfg: Config): Promise<void> {
    if (this.config) {
      this.logger.info('Initialized');
      this.register();
      this.state = 'Initialized';
      this.startServer(cfg);
    } else {
      this.logger.debug('Config not set');
      this.state = 'Unconfigured';
    }
  }

  protected register() {
    ExtensionRepository.getInstance().registerExfil(this);
  }

  get hosts(): Promise<string[]> {
    return Promise.resolve([`https://${this.config.hosts[0]}/`]);
  }

  private startServer(globalCfg: Config) {
    const c = this.cfg.config;
    const binary = c.serverBinary;
    const dir = c.serverDirectory;

    const ext = globalCfg.exfil.find((e): e is ExtensionItem<ExfilBasicHTTP> => e.type == 'basichttp' && e.name == 'internal' && !!(e.config as ExfilBasicHTTP)?.server);
    if (!ext)
      throw new Error(
        'Running the QUIC extension requires a basichttp instance that runs locally; aborting...'
      );

    this.logger.info(`Spawning QUIC server on https://${c.bindInterface.host}:${c.bindInterface.port}...`)

    const quicServer = child.spawn(
      path.join(process.cwd(), dir, binary),
      [
        '--host',
        c.bindInterface.host,
        '--webport', //TODO: Remove, also from quic server code ¯\_(ツ)_/¯
        '5001',
        '--quicport',
        c.bindInterface.port.toString(),
        '--pfxfile',
        c.ssl.pfx_file,
        '--pfxpass',
        c.ssl.pfx_pass,
        '--vvhost',
        ext.config.server.host,
        '--vvport',
        ext.config.server.port.toString(), //TODO: change that to the internal port currently 8443
        '--vvext',
        ext.name,
      ],
      { cwd: path.join(process.cwd(), dir), env: process.env }
    );

    // Capture standard output
    quicServer.stdout.on('data', (data) => {
      console.log(`QUIC Server STDOUT: ${data}`);
    });

    // Capture standard error
    quicServer.stderr.on('data', (data) => {
      console.error(`QUIC Server STDERR: ${data}`);
    });
  }

  async installRoutes(backendApp: Express): Promise<void> {}

  // Unsupported methods
  async uploadSingle(
    storageName: string,
    data: BinaryData
  ): Promise<FileUploadInformation> {
    throw new Error('Method not supported.');
  }

  async downloadSingle(info: FileInformation): Promise<BinaryData> {
    throw new Error('Method not supported.');
  }
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
