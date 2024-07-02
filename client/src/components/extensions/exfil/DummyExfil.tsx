import {
  ApiConfigBaseExfil,
  ApiConfigResponse,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
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
  StorageExtension,
} from '../Extension';

export class DummyExfil extends BaseExfilExtension {
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
  isPresent(): boolean {
    return true;
  }
  getConfig(): ApiConfigBaseExfil {
    return {
      single_size: 1024 * 1024 * 1024,
      chunk_size: 1024 * 1024 * 1024,
    };
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
  get name(): string {
    return 'dummyexfil';
  }
  get displayName(): string {
    return 'Dummy Exfiltration Transport';
  }
  get description(): string {
    return "Non-functional dummy exfiltration transport. This won't do anything and is only used for testing the frontend. It offers all capabilities Volatile Vault provides to exfiltration extensions.";
  }
}
