import axios from 'axios';
import Api, {
  ApiConfigBasicHTTPExfil,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
} from '../../../../utils/Api';
import {
  BaseExfilExtension,
  ExfilConfigFn,
  ExfilDownloadFn,
  ExfilDownloadViewProps,
  ExfilProviderCapabilities,
  ExfilUploadFn,
  ReportEvent,
} from '../../Extension';
import BasicHttpDownload from './BasicHttpDownload';
import BasicHttpUpload from './BasicHttpUpload';

export class BasicHttpExfil extends BaseExfilExtension {
  get downloadSingleView(): ExfilDownloadFn {
    return () => <BasicHttpDownload exfil={this} />;
  }
  get uploadSingleView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => (
      <BasicHttpUpload exfil={this} storage={storage} />
    );
  }
  get configView(): ExfilConfigFn {
    throw new Error('Method not implemented.');
  }
  get downloadChunkedView(): ExfilDownloadFn {
    throw new Error('Method not implemented.');
  }
  get uploadChunkedView(): ExfilUploadFn {
    throw new Error('Method not implemented.');
  }

  get name(): string {
    return 'basichttp';
  }
  get displayName(): string {
    return 'Built-In HTTP';
  }
  get description(): string {
    return 'Uses regular HTTP(S) for file uploads and downloads. Files are zipped & encrypted before upload and decrypted & unzipped after download. Uploads and downloads use a REST interface and data is transferred in large, continuous blobs. Transfer looks like regular HTTP uploads/downloads.';
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return ['UploadSingle', 'DownloadSingle'];
  }
  override isPresent(): boolean {
    return (
      this.config.exfils.basichttp !== undefined &&
      this.config.exfils.basichttp !== null
    );
  }
  getConfig(): ApiConfigBasicHTTPExfil {
    if (!this.config.exfils.basichttp)
      throw new Error('Attempted to access missing basichttp config!');
    return this.config.exfils.basichttp.info as ApiConfigBasicHTTPExfil;
  }

  async downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    const cfg = this.getConfig();
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    try {
      const res = await axios.get(`${host}/api/files/download/${id}`, {
        headers: {
          Authorization: `Bearer ${this.api.token}`,
        },
        responseType: 'arraybuffer',
      });

      if (!res.data)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to download data')
        );

      return Api.success_from_data({
        data: res.data,
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
    const cfg = this.getConfig();
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    try {
      const res = await axios.post(
        `${host}/api/files/upload/${storage}`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${this.api.token}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: 'json',
        }
      );

      if (!res.data?.id)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to upload file ID')
        );

      return Api.success_from_data(res.data) as ApiUploadResponse;
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