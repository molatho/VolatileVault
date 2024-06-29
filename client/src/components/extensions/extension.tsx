import Api, {
  ApiConfigBaseExfil,
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
export type ReportEvent = (
  category: string,
  content: string,
  variant?: 'error' | 'success'
) => void;

export interface BasicInfoHolder {
  name: string;
  displayName: string;
  description: string;
}

export interface StorageExtension extends BasicInfoHolder {
  name: string;
  displayName: string;
  isPresent: (config: ApiConfigResponse) => boolean;
  configView?: (config: ApiConfigResponse) => JSX.Element;
  infoView?: (config: ApiConfigResponse) => JSX.Element;
}

export interface ExfilExtension extends BasicInfoHolder {
  get capabilities(): ExfilProviderCapabilities[];
  isPresent: () => boolean;
  getConfig: () => ApiConfigBaseExfil;

  canDownloadSingle: () => boolean;
  canUploadSingle: () => boolean;
  canDownloadChunked: () => boolean;
  canUploadChunked: () => boolean;
  canAddHost: () => boolean;
  canRemoveHost: () => boolean;

  // Custom views, only effective if overridden & booleans set
  downloadSingleView: (storage: StorageExtension) => TabView;
  uploadSingleView: (storage: StorageExtension) => TabView;
  downloadChunkedView: (storage: StorageExtension) => TabView;
  uploadChunkedView: (storage: StorageExtension) => TabView;
  configView: (config: ApiConfigResponse) => TabView;

  // Backend API calls analogous to server\src\extensions\exfil\provider.ts
  downloadSingle: (
    id: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiDownloadResponse>;
  uploadSingle: (
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent
  ) => Promise<ApiUploadResponse>;
  initChunkDownload: (
    storage: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiResponse>;
  initChunkUpload: (
    storage: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiResponse>; // TODO: Define info type
  downloadChunk: (
    id: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiDownloadResponse>;
  uploadChunk: (
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent
  ) => Promise<ApiUploadResponse>;
  addHost: (reportEvent: ReportEvent) => Promise<string>;
  removeHost: (host: string, reportEvent: ReportEvent) => Promise<void>;
}

export abstract class BaseExfilExtension implements ExfilExtension {
  protected api: Api;
  protected config: ApiConfigResponse;

  public constructor(api: Api, config: ApiConfigResponse) {
    this.api = api;
    this.config = config;
  }
  abstract get capabilities(): ExfilProviderCapabilities[];

  canDownloadSingle(): boolean {
    return 'DownloadSingle' in this.capabilities;
  }
  canUploadSingle(): boolean {
    return 'UploadSingle' in this.capabilities;
  }
  canDownloadChunked(): boolean {
    return 'DownloadChunked' in this.capabilities;
  }
  canUploadChunked(): boolean {
    return 'UploadChunked' in this.capabilities;
  }
  canAddHost(): boolean {
    return 'AddHost' in this.capabilities;
  }
  canRemoveHost(): boolean {
    return 'RemoveHost' in this.capabilities;
  }

  abstract isPresent(): boolean;
  abstract getConfig(): ApiConfigBaseExfil;
  abstract downloadSingleView(storage: StorageExtension): TabView;
  abstract uploadSingleView(storage: StorageExtension): TabView;
  abstract downloadChunkedView(storage: StorageExtension): TabView;
  abstract uploadChunkedView(storage: StorageExtension): TabView;
  abstract configView(config: ApiConfigResponse): TabView;
  abstract downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse>;
  abstract uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse>;
  abstract initChunkDownload(
    storage: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiResponse>;
  abstract initChunkUpload(
    storage: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiResponse>;
  abstract downloadChunk(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse>;
  abstract uploadChunk(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse>;
  abstract addHost(reportEvent: ReportEvent): Promise<string>;
  abstract removeHost(host: string, reportEvent: ReportEvent): Promise<void>;
  abstract get name(): string;
  abstract get displayName(): string;
  abstract get description(): string;
}

export const STORAGES: StorageExtension[] = [
  {
    name: 'filesystem',
    displayName: 'Built-in Filesystem',
    description:
      'File storage in the backed server. Files are removed after a configurable amount of time.',
    isPresent: (config: ApiConfigResponse) =>
      config.storages.filesystem !== undefined &&
      config.storages.filesystem !== null,
  },
];
