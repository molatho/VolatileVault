import {
  ApiConfigBaseExfil,
  ApiConfigResponse,
  ApiDownloadResponse,
  ApiUploadResponse,
  ApiResponse,
} from '../../../utils/Api';
import {
  BaseExfilExtension,
  ExfilProviderCapabilities,
  ReportEvent,
  StorageExtension,
  TabView,
} from '../Extension';

export class DummyExfil extends BaseExfilExtension {
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
  downloadSingleView(storage: StorageExtension): TabView {
    return {
      tabText: "Dummy basic download",
      content: <>Dummy basic download</>
    }
  }
  uploadSingleView(storage: StorageExtension): TabView {
    return {
      tabText: "Dummy basic upload",
      content: <>Dummy basic upload</>
    }
  }
  downloadChunkedView(storage: StorageExtension): TabView {
    return {
      tabText: "Dummy chunked download",
      content: <>Dummy chunked download</>
    }
  }
  uploadChunkedView(storage: StorageExtension): TabView {
    return {
      tabText: "Dummy chunked upload",
      content: <>Dummy chunked upload</>
    }
  }
  configView(config: ApiConfigResponse): TabView {
    return {
      tabText: "Dummy config view",
      content: <>Dummy config view</>
    }
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
