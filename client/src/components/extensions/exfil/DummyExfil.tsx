import Api, {
  ApiDownloadResponse,
  ApiUploadResponse,
  ExfilTypes,
  ExtensionItem,
} from '../../../utils/Api';
import {
  BaseExfilExtension,
  ConfigFn,
  ConfigViewProps,
  ExfilDownloadFn,
  ExfilDownloadViewProps,
  ExfilProviderCapabilities,
  ExfilUploadFn,
  ReportEvent,
} from '../Extension';

export class DummyExfil extends BaseExfilExtension<ExfilTypes> {
  public static get extension_name(): string {
    return 'dummyexfil';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BaseExfilExtension<ExfilTypes> {
    return new DummyExfil(api, cfg);
  }

  get downloadSingleView(): ExfilDownloadFn {
    return () => <>Dummy single download</>;
  }
  get uploadSingleView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => <>Dummy single upload</>;
  }
  get downloadChunkedView(): ExfilDownloadFn {
    return () => <>Dummy chunked download</>;
  }
  get uploadChunkedView(): ExfilUploadFn {
    return ({ storage }: ExfilDownloadViewProps) => <>Dummy chunked upload</>;
  }
  get configView(): ConfigFn {
    return (props: ConfigViewProps) => <>Dummy config view</>;
  }
  get capabilities(): ExfilProviderCapabilities[] {
    return [
      'UploadSingle',
      'UploadChunked',
      'DownloadChunked',
      'DownloadSingle',
      'RemoveHost',
      'AddHost',
    ];
  }

  downloadSingle(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    throw new Error('Method not implemented.');
  }
  uploadSingle(
    storage: string,
    data: ArrayBuffer,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiUploadResponse> {
    throw new Error('Method not implemented.');
  }
  downloadChunked(
    id: string,
    reportEvent?: ReportEvent | undefined
  ): Promise<ApiDownloadResponse> {
    throw new Error('Method not implemented.');
  }
  uploadChunked(
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

  get description(): string {
    const desc =
      "Non-functional dummy exfiltration transport. This won't do anything and is only used for testing the frontend. It offers all capabilities Volatile Vault provides to exfiltration extensions.";

    if (this.cfg.description) return desc + ' ' + this.cfg.description;
    return desc;
  }
}
