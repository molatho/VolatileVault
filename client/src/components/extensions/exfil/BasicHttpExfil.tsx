import axios from 'axios';
import Api, {
  ApiConfigBasicHTTPExfil,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
  ExtensionItem,
} from '../../../utils/Api';
import {
  BaseExfilExtension,
  ConfigFn,
  ExfilDownloadFn,
  ExfilDownloadViewProps,
  ExfilProviderCapabilities,
  ExfilUploadFn,
  ReportEvent,
} from '../Extension';
import GenericHttpDownload from '../../ui/GenericHttpDownload';
import GenericHttpUpload from '../../ui/GenericHttpUpload';

export class BasicHttpExfil extends BaseExfilExtension<ApiConfigBasicHTTPExfil> {
  public static get extension_name(): string {
    return 'basichttp';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BaseExfilExtension<ApiConfigBasicHTTPExfil> {
    return new BasicHttpExfil(api, cfg);
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
      'Uses regular HTTP(S) for file uploads and downloads. Files are zipped & encrypted before upload and decrypted & unzipped after download. Uploads and downloads use a REST interface and data is transferred in large, continuous blobs. Transfer looks like regular HTTP uploads/downloads.';
    if (this.cfg.description) return desc + ' ' + this.cfg.description;
    return desc;
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return ['UploadSingle', 'DownloadSingle'];
  }

  async downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    const cfg = this.cfg.info! as ApiConfigBasicHTTPExfil;
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    try {
      const res = await axios.get(`${host}/api/${this.name}/download/${id}`, {
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
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as ApiDownloadResponse
      );
    }
  }

  async uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    const cfg = this.cfg.info! as ApiConfigBasicHTTPExfil;
    const host =
      cfg.hosts && cfg.hosts.length
        ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)]
        : Api.BASE_URL;

    try {
      const res = await axios.post(
        `${host}/api/${this.name}/upload/${storage}`,
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
