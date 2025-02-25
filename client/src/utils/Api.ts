import axios from 'axios';
import Config from './Config';

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface ApiGetAuthResponse extends ApiResponse { }

export interface ApiAuthResponse extends ApiResponse {
  token?: string;
}

export interface ApiUploadResponse extends ApiResponse {
  id?: string;
  lifeTime?: number;
}

export interface ApiDownloadResponse extends ApiResponse {
  data: ArrayBuffer;
}

export interface ExtensionItem<T extends object> {
  type: string;
  name: string;
  display_name: string;
  description?: string;
  info?: object;
}

export type StorageTypes = ApiConfigBaseStorage;
export type ExfilTypes = ApiConfigBasicHTTPExfil | ApiConfigAwsCloudFrontExfil | ApiConfigQuicExfil;
export type ExtensionTypes = StorageTypes | ExfilTypes;

export interface ApiConfigResponse extends ApiResponse {
  storages: ExtensionItem<StorageTypes>[];
  exfils: ExtensionItem<ExfilTypes>[];
}


export interface ApiConfigBaseExfil {
  max_size?: number;
  chunk_size?: number;
}

export interface ApiConfigQuicExfil extends ApiConfigBaseExfil {
  hosts: string[];
  certificate_hash: string;
}

export interface ApiConfigBasicHTTPExfil extends ApiConfigBaseExfil {
  hosts: string[];
}

export type AwsCloudFrontTransferMode = 'Dynamic' | 'Static';

export interface AwsCloudFrontTransferConfig {
  mode: AwsCloudFrontTransferMode;
  hosts?: string[];
}

export interface ApiConfigAwsCloudFrontExfil extends ApiConfigBaseExfil {
  upload: AwsCloudFrontTransferConfig;
  download: AwsCloudFrontTransferConfig;
}

export interface ApiConfigBaseStorage {
  max_size: number;
  file_expiry: number;
}

export default class Api {
  public token?: string = undefined;
  private static PROTO = window.location.protocol;
  public static BASE_URL: string = Config.BASE_URL ?? window.location.origin;

  public static get_baseurl(hosts?: string[]): string {
    const _hosts = hosts?.
      map(h => h.includes("://") ? h : `${Api.PROTO}//${h}`).
      filter(h => h.startsWith(Api.PROTO)) ?? [];
    if (_hosts.length > 0)
      return _hosts[Math.floor(Math.random() * _hosts.length)];
    return Api.BASE_URL;
  }

  public static fail_from_error(
    error: any,
    defaultMessage: string = 'Failure'
  ): ApiResponse {
    return {
      success: false,
      message: error?.response?.data?.message ?? defaultMessage,
    };
  }

  public static success_from_data(data: any): ApiResponse {
    return { ...data, success: true };
  }

  public async isAuthenticated(): Promise<ApiGetAuthResponse> {
    try {
      type Obj = { [key: string]: string };
      var headers: Obj = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await axios.get(Api.BASE_URL + '/api/auth', {
        headers: headers,
      });

      return Api.success_from_data(res.data) as ApiGetAuthResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(
        Api.fail_from_error(error, 'Unauthorized')
      );
    }
  }

  public async authenticate(code: string): Promise<ApiAuthResponse> {
    try {
      type Obj = { [key: string]: string };
      var headers: Obj = {};
      headers['content-type'] = 'application/json';
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const res = await axios.post(
        Api.BASE_URL + '/api/auth',
        { totp: code },
        { headers: { 'content-type': 'application/json' } }
      );

      if (!res.data?.token)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to receive JWT')
        );

      this.token = res.data.token;
      return Api.success_from_data(res.data) as ApiGetAuthResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(Api.fail_from_error(error));
    }
  }

  public async config(): Promise<ApiConfigResponse> {
    try {
      const res = await axios.get(Api.BASE_URL + '/api/config', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        responseType: 'json',
      });

      return Api.success_from_data(res.data) as ApiConfigResponse;
    } catch (error) {
      return Promise.reject(Api.fail_from_error(error) as ApiConfigResponse);
    }
  }

  public saveToken() {
    if (!this.token) throw new Error("Can't save token; token unset!");
    localStorage.setItem('token', this.token);
  }

  public getToken(): string | null {
    const token = localStorage.getItem('token');
    if (token)
      this.token = token;
    return token;
  }

  public clearToken() {
    localStorage.removeItem("token");
    this.token = undefined;
  }
}
