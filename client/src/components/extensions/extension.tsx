import Api, {
  ApiConfigBaseExfil,
  ApiConfigResponse,
  ApiDownloadResponse,
  ApiUploadResponse,
} from '../../utils/Api';

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
  isPresent: (config: ApiConfigResponse) => boolean;
  isConfigurable: boolean;
  configView: ConfigFn;
}

export interface StorageExtension extends BasicInfoHolder {
}

export interface ExfilDownloadViewProps {
  storage: StorageExtension;
}
export interface ConfigViewProps {
  config: ApiConfigResponse;
  onChange: (config: ApiConfigResponse) => void;
}

export type ExfilDownloadFn = () => JSX.Element;
export type ExfilUploadFn = (props: ExfilDownloadViewProps) => JSX.Element;
export type ConfigFn = (props: ConfigViewProps) => JSX.Element;

export interface ExfilExtension extends BasicInfoHolder {
  get capabilities(): ExfilProviderCapabilities[];
  isPresent: () => boolean;
  getConfig: () => ApiConfigBaseExfil;

  get canDownloadSingle(): boolean;
  get canUploadSingle(): boolean;
  get canDownloadChunked(): boolean;
  get canUploadChunked(): boolean;
  get canAddHost(): boolean;
  get canRemoveHost(): boolean;

  // Custom views, only effective if overridden & booleans set
  downloadSingleView: ExfilDownloadFn;
  uploadSingleView: ExfilUploadFn;
  downloadChunkedView: ExfilDownloadFn;
  uploadChunkedView: ExfilUploadFn;

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
  downloadChunked: (
    id: string,
    reportEvent?: ReportEvent
  ) => Promise<ApiDownloadResponse>;
  uploadChunked: (
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

  abstract get downloadSingleView(): ExfilDownloadFn;
  abstract get uploadSingleView(): ExfilUploadFn;
  abstract get downloadChunkedView(): ExfilDownloadFn;
  abstract get uploadChunkedView(): ExfilUploadFn;
  abstract get configView(): ConfigFn;

  abstract get capabilities(): ExfilProviderCapabilities[];

  get canDownloadSingle(): boolean {
    return this.capabilities.indexOf('DownloadSingle') !== -1;
  }
  get canUploadSingle(): boolean {
    return this.capabilities.indexOf('UploadSingle') !== -1;
  }
  get canDownloadChunked(): boolean {
    return this.capabilities.indexOf('DownloadChunked') !== -1;
  }
  get canUploadChunked(): boolean {
    return this.capabilities.indexOf('UploadChunked') !== -1;
  }
  get canAddHost(): boolean {
    return this.capabilities.indexOf('AddHost') !== -1;
  }
  get canRemoveHost(): boolean {
    return this.capabilities.indexOf('RemoveHost') !== -1;
  }

  get isConfigurable(): boolean {
    return this.canAddHost || this.canRemoveHost;
  }

  abstract isPresent(): boolean;
  abstract getConfig(): ApiConfigBaseExfil;

  abstract downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse>;
  abstract uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse>;
  abstract downloadChunked(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse>;
  abstract uploadChunked(
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