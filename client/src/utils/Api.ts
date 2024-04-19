import axios, { Axios, AxiosRequestConfig } from 'axios';
import Config from './Config';

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface ApiGetAuthResponse extends ApiResponse {}

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

export interface ApiConfigResponse extends ApiResponse {
  storages: ApiConfigStorageCollection;
  exfils: ApiConfigExfilsCollection;
}

export interface ApiConfigExfilsCollection {
  basichttp?: ApiConfigItem<ApiConfigBasicHTTPExfil>;
}

export interface ApiConfigBaseExfil {
  single_size?: number;
  chunk_size?: number;
}

export interface ApiConfigBasicHTTPExfil extends ApiConfigBaseExfil {
  hosts: string[];
}

export interface ApiConfigStorageCollection {
  filesystem?: ApiConfigItem<ApiConfigBaseStorage>;
}

export interface ApiConfigBaseStorage {
  max_size: number;
  file_expiry: number;
}

export interface ApiConfigItem<T extends object> {
  name: string;
  displayName: string;
  info?: T;
}

export default class Api {
  public token?: string = undefined;
  public static BASE_URL: string = Config.BASE_URL;

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
      const res = await axios.get(Api.BASE_URL + '/api/auth');

      return Api.success_from_data(res.data) as ApiGetAuthResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(
        Api.fail_from_error(error, 'Unauthorized')
      );
    }
  }

  public async authenticate(code: string): Promise<ApiAuthResponse> {
    try {
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

  public async upload(blob: ArrayBuffer): Promise<ApiUploadResponse> {
    try {
      const res = await axios.post(Api.BASE_URL + '/api/files/upload', blob, {
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${this.token}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        responseType: 'json',
      });

      if (!res.data?.id)
        return Promise.reject(
          Api.fail_from_error(undefined, 'Failed to upload file ID')
        );

      return Api.success_from_data(res.data) as ApiUploadResponse;
    } catch (error) {
      return Promise.reject<ApiResponse>(Api.fail_from_error(error));
    }
  }

  public async download(id: string): Promise<ApiDownloadResponse> {
    try {
      const res = await axios.get(`${Api.BASE_URL}/api/files/download/${id}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        responseType: 'arraybuffer',
      });

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
}
