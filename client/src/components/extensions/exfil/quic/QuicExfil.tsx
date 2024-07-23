import Api, {
  ApiConfigQuicExfil,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
  ExtensionItem,
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
import GenericHttpDownload from '../../../ui/GenericHttpDownload';
import GenericHttpUpload from '../../../ui/GenericHttpUpload';
import WebTransportService from './WebTransportService';

export class QuicExfil extends BaseExfilExtension<ApiConfigQuicExfil> {
  public static get extension_name(): string {
    return 'quic';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BaseExfilExtension<ApiConfigQuicExfil> {
    return new QuicExfil(api, cfg);
  }

  get downloadSingleView(): ExfilDownloadFn {
    return () => <GenericHttpDownload exfil={this} mode="DownloadSingle" />;
  }
  get uploadSingleView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => (
      <GenericHttpUpload exfil={this} storage={storage} mode="UploadSingle" />
    );
  }
  get configView(): ConfigFn {
    throw new Error('Method not supported.');
  }
  get downloadChunkedView(): ExfilDownloadFn {
    throw new Error('Method not supported.');
  }
  get uploadChunkedView(): ExfilUploadFn {
    throw new Error('Method not supported.');
  }

  get description(): string {
    const desc =
      'Uses regular HTTP(S) for file uploads and downloads. Files are zipped & encrypted before upload and decrypted & unzipped after download. Uploads and downloads are handled by a QUIC server which internally uses the BasicHTTP functionality.';
    if (this.cfg.description) return desc + ' ' + this.cfg.description;
    return desc;
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return ['UploadSingle', 'DownloadSingle'];
  }

  private async initializeWebTransportService(): Promise<WebTransportService> {
    // TODO: Api.BASE_URL will fail because it needs to be a different port than the express!
    const cfg = this.cfg.info! as ApiConfigQuicExfil;
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    try{
      const webTransportService = new WebTransportService(`${host}/webtransport`);
      await webTransportService.connect();
      return webTransportService;
    }catch(error){
      console.error('Failed to establish WebTransport connection:', error);
      return Promise.reject(
        Api.fail_from_error(undefined, 'Failed to establish WebTransport connection')
      );
    }
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
      await webTransportService.sendData(JSON.stringify({ authorization: this.api.token, action: 'upload'}));
      

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

      await webTransportService.sendData(JSON.stringify({ authorization: this.api.token, action: 'upload', storage, data: data }));

      return Api.success_from_data(res) as ApiUploadResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(Api.fail_from_error(error));
    }
  }
  downloadChunked(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    throw new Error('Method not supported.');
  }
  uploadChunked(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    throw new Error('Method not supported.');
  }
  addHost(reportEvent: ReportEvent): Promise<string> {
    throw new Error('Method not supported.');
  }
  removeHost(host: string, reportEvent: ReportEvent): Promise<void> {
    throw new Error('Method not supported.');
  }
}
