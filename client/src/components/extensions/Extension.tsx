import Api, {
  ApiConfigBaseExfil,
  ApiConfigResponse,
  ApiDownloadResponse,
  ApiUploadResponse,
  ExfilTypes,
  ExtensionItem,
  ExtensionTypes,
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
  isConfigurable: boolean;
  configView: ConfigFn;
}

export abstract class BasicExtension<EXC extends ExtensionTypes>
  implements BasicInfoHolder
{
  protected cfg: ExtensionItem<EXC>;
  protected api: Api;

  protected constructor(api: Api, cfg: ExtensionItem<EXC>) {
    this.cfg = cfg;
    this.api = api;
  }

  public get name(): string {
    return this.cfg.name;
  }
  public get displayName(): string {
    return `[${this.cfg.type}] ${this.cfg.display_name}`;
  }
  public get description(): string {
    return this.cfg.description ?? '';
  }

  public abstract get isConfigurable(): boolean;
  public abstract get configView(): ConfigFn;

  public static get extension_name(): string {
    throw new Error('Pure virtual call!');
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BasicExtension<ExtensionTypes> {
    throw new Error('Pure virtual call!');
  }
}

export interface StorageExtension extends BasicInfoHolder {}

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

  get canDownloadSingle(): boolean;
  get canUploadSingle(): boolean;
  get canDownloadChunked(): boolean;
  get canUploadChunked(): boolean;
  get canAddHost(): boolean;
  get canRemoveHost(): boolean;

  getConfig(): ApiConfigBaseExfil;

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

export type GenericExfilExtension = BaseExfilExtension<ExfilTypes>;

export abstract class BaseExfilExtension<T extends ExfilTypes>
  extends BasicExtension<T>
  implements ExfilExtension
{
  getConfig(): ApiConfigBaseExfil {
    return this.cfg.info! as ApiConfigBaseExfil;
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
}
