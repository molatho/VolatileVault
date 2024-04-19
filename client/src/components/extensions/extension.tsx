import axios from 'axios';
import Api, {
  ApiConfigBaseExfil,
  ApiConfigBasicHTTPExfil,
  ApiConfigResponse,
  ApiDownloadResponse,
  ApiResponse,
  ApiUploadResponse,
} from '../../utils/Api';

export interface TabView {
  tabText: string;
  content: JSX.Element;
  infoView?: JSX.Element;
}

export type ExfilProviderCapabilities =
  | 'None'
  | 'UploadSingle'
  | 'DownloadSingle'
  | 'UploadChunked'
  | 'DownloadChunked'
  | 'AddHost'
  | 'RemoveHost';

// Callback used to provide live updates to the UI
type ReportEvent = (
  category: string,
  content: string,
  variant?: 'error' | 'success'
) => void;

export interface ExfilExtension {
  get name(): string;
  get displayName(): string;
  get capabilities(): ExfilProviderCapabilities[];
  isPresent: (config: ApiConfigResponse) => boolean;
  getConfig: (config: ApiConfigResponse) => ApiConfigBaseExfil;

  // Custom views, only effective if overridden & booleans set
  downloadSingleView?: (config: ApiConfigResponse, api: Api, extension: ExfilExtension) => TabView;
  uploadSingleView?: (config: ApiConfigResponse, api: Api, extension: ExfilExtension) => TabView;
  downloadChunkedView?: (config: ApiConfigResponse, api: Api, extension: ExfilExtension) => TabView;
  uploadChunkedView?: (config: ApiConfigResponse, api: Api, extension: ExfilExtension) => TabView;
  configView?: (config: ApiConfigResponse) => TabView;

  // Backend API calls analogous to server\src\extensions\exfil\provider.ts
  downloadSingle?: (
    config: ApiConfigBaseExfil,
    api: Api,
    id: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiDownloadResponse>;
  uploadSingle?: (
    config: ApiConfigBaseExfil,
    api: Api,
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent
  ) => Promise<ApiUploadResponse>;
  initChunkDownload?: (
    config: ApiConfigBaseExfil,
    api: Api,
    storage: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiResponse>;
  initChunkUpload?: (
    config: ApiConfigBaseExfil,
    api: Api,
    storage: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiResponse>; // TODO: Define info type
  downloadChunk?: (
    config: ApiConfigBaseExfil,
    api: Api,
    id: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiDownloadResponse>;
  uploadChunk?: (
    config: ApiConfigBaseExfil,
    api: Api,
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent
  ) => Promise<ApiUploadResponse>;
  addHost?: (
    config: ApiConfigBaseExfil,
    api: Api,
    reportEvent: ReportEvent
  ) => Promise<string>;
  removeHost?: (
    config: ApiConfigBaseExfil,
    api: Api,
    host: string,
    reportEvent: ReportEvent
  ) => Promise<void>;
}

export const EXFILS: ExfilExtension[] = [
  {
    name: 'basichttp',
    displayName: 'Built-in HTTP',
    capabilities: ['UploadSingle', 'DownloadSingle'],
    isPresent: (config: ApiConfigResponse) =>
      config.exfils.basichttp !== undefined && config.exfils.basichttp !== null,
    getConfig: (config: ApiConfigResponse) =>
      config.exfils.basichttp as ApiConfigBaseExfil,
    uploadSingle: async (config, api, storage, data, reportEvent) => {
      const cfg = config as ApiConfigBasicHTTPExfil;
      const host = cfg.hosts && cfg.hosts.length ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)] : Api.BASE_URL;

      try {
        const res = await axios.post(
          `${host}/api/files/upload/${storage}`,
          data,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              Authorization: `Bearer ${api.token}`,
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
    },
    downloadSingle: async (config, api, id, reportEvent) => {
      const cfg = config as ApiConfigBasicHTTPExfil;
      const host = cfg.hosts && cfg.hosts.length ? cfg.hosts[Math.floor(Math.random() * cfg.hosts.length)] : Api.BASE_URL;

      try {
        const res = await axios.get(
          `${host}/api/files/download/${id}`,
          {
            headers: {
              Authorization: `Bearer ${api.token}`,
            },
            responseType: 'arraybuffer',
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
            (error as any)?.response?.status == 404 ? 'ID not found' : 'Failure'
          ) as ApiDownloadResponse
        );
      }
    },
  },
];

export interface StorageExtension {
  name: string;
  displayName: string;
  isPresent: (config: ApiConfigResponse) => boolean;
  configView?: (config: ApiConfigResponse) => JSX.Element;
  infoView?: (config: ApiConfigResponse) => JSX.Element;
}

export const STORAGES: StorageExtension[] = [
  {
    name: 'filesystem',
    displayName: 'Built-in Filesystem',
    isPresent: (config: ApiConfigResponse) =>
      config.storages.filesystem !== undefined &&
      config.storages.filesystem !== null,
  },
];
