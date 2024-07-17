import Api, {
  ApiConfigQuicExfil,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
} from '../../../../utils/Api';
import {
  BaseExfilExtension,
  ConfigFn,
  ExfilDownloadFn,
  ExfilDownloadViewProps,
  ExfilProviderCapabilities,
  ExfilUploadFn,
  ReportEvent,
} from '../../Extension';
import QuicDownload from './QuicDownload';
import QuicUpload from './QuicUpload';
import WebTransportService from './WebTransportService';

export class QuicExfil extends BaseExfilExtension {
 
  get downloadSingleView(): ExfilDownloadFn {
    return () => <QuicDownload exfil={this} />;
  }
  get uploadSingleView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => (
      <QuicUpload exfil={this} storage={storage} />
    );
  }
  get configView(): ConfigFn {
    throw new Error('Method not implemented.');
  }
  get downloadChunkedView(): ExfilDownloadFn {
    throw new Error('Method not implemented.');
  }
  get uploadChunkedView(): ExfilUploadFn {
    throw new Error('Method not implemented.');
  }

  get name(): string {
    return 'quic';
  }
  get displayName(): string {
    return 'Built-In QUIC';
  }
  get description(): string {
    return 'Uses QUIC for file uploads and downloads. Files are zipped & encrypted before upload and decrypted & unzipped after download. Uploads and downloads use a REST interface and data is transferred in large, continuous blobs. Transfer looks like regular HTTP uploads/downloads.';
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return ['UploadSingle', 'DownloadSingle'];
  }
  override isPresent(): boolean {
    return (
      this.config.exfils.quic !== undefined &&
      this.config.exfils.quic !== null
    );
  }
  getConfig(): ApiConfigQuicExfil {
    if (!this.config.exfils.quic)
      throw new Error('Attempted to access missing quic config!');
    return this.config.exfils.quic.info as ApiConfigQuicExfil;
  }

  private async initializeWebTransportService(): Promise<WebTransportService> {
    const cfg = this.getConfig();
    // TODO: Api.BASE_URL will fail because it needs to be a different port than the express!
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    const webTransportService = new WebTransportService(`${host}/webtransport`);
    await webTransportService.connect();
    return webTransportService;
  }

  async downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    try {
      const webTransportService = await this.initializeWebTransportService();
      await webTransportService.sendData(JSON.stringify({ authorization: this.api.token, action: 'download', id }));
      const data = await new Promise<string>((resolve) => {
        webTransportService.receiveData((receivedData) => {
          resolve(receivedData);
        });
      });

      if (!data)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to download data')
        );

      return Api.success_from_data({
        data: new Uint8Array(Buffer.from(data)),
      }) as ApiDownloadResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status == 404 ? 'ID not found' : 'Failure'
        ) as ApiDownloadResponse
      );
    }
  }

  async uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    try {
      const webTransportService = await this.initializeWebTransportService();
      const encodedData = Buffer.from(data).toString('base64');
      await webTransportService.sendData(JSON.stringify({ authorization: this.api.token, action: 'upload', storage, data: encodedData }));

      const response = await new Promise<string>((resolve) => {
        webTransportService.receiveData((receivedData) => {
          resolve(receivedData);
        });
      });

      const res = JSON.parse(response);

      if (!res?.id)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to upload file ID')
        );

      return Api.success_from_data(res) as ApiUploadResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(Api.fail_from_error(error));
    }
  }

  initChunkDownload(
    storage: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiResponse> {
    throw new Error('Method not implemented.');
  }
  initChunkUpload(
    storage: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiResponse> {
    throw new Error('Method not implemented.');
  }
  downloadChunk(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    throw new Error('Method not implemented.');
  }
  uploadChunk(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    throw new Error('Method not implemented.');
  }
  addHost(reportEvent: ReportEvent): Promise<string> {
    throw new Error('Method not implemented.');
  }
  removeHost(host: string, reportEvent: ReportEvent): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
