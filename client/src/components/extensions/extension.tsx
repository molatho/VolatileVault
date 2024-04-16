import Api, { ApiConfigResponse } from '../../utils/Api';
import BasicHTTPDownload from './exfil/basichttp/BasicHTTPDownload';
import BasicHTTPUpload from './exfil/basichttp/BasicHTTPUpload';

export interface TabView {
    displayName: string;
    content: JSX.Element
}

export interface ExfilExtension {
    name:string,
    displayName: string;
  isPresent: (config: ApiConfigResponse) => boolean;
  downloadSingleView?: (
    config: ApiConfigResponse,
    api: Api
  ) => TabView | null;
  uploadSingleView?: (
    config: ApiConfigResponse,
    api: Api
  ) => TabView | null;
  downloadChunkedView?: (
    config: ApiConfigResponse,
    api: Api
  ) => TabView | null;
  uploadChunkedView?: (
    config: ApiConfigResponse,
    api: Api
  ) => TabView | null;
  hostInfoView?: (config: ApiConfigResponse, api: Api) => TabView | null;
}

export const EXFILS: ExfilExtension[] = [
  {
    name: "",
    displayName: "",
    isPresent: (config: ApiConfigResponse) =>
      config.exfils.basichttp !== undefined && config.exfils.basichttp !== null,
    downloadSingleView: (config: ApiConfigResponse, api: Api) => (
      <BasicHTTPDownload api={api} config={config} />
    ),
    uploadSingleView: (config: ApiConfigResponse, api: Api) => (
      <BasicHTTPUpload api={api} config={config} />
    ),
  },
];

export interface StorageExtension {
  isPresent: (config: ApiConfigResponse) => boolean;
  configView?: (config: ApiConfigResponse) => JSX.Element | null;
  infoView: (config: ApiConfigResponse) => JSX.Element | null;
}
