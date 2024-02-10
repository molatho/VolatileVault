import axios from 'axios';
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
  fileSize?: number;
}

export default class Api {
  public token?: string = undefined;
  private static BASE_URL: string = Config.BASE_URL;

  private static fail_from_error(
    error: any,
    defaultMessage: string = 'Failure'
  ): ApiResponse {
    return {
      success: false,
      message: error?.response?.data?.message ?? defaultMessage,
    };
  }

  private static success_from_data(data: any): ApiResponse {
    return { ...data, success: true };
  }

  public isAuthenticated(): Promise<ApiGetAuthResponse> {
    return axios
      .get(Api.BASE_URL + '/api/auth')
      .then((res) => Api.success_from_data(res.data) as ApiGetAuthResponse)
      .catch((err) =>
        Promise.reject<ApiResponse>(Api.fail_from_error(err, 'Unauthorized'))
      );
  }

  public authenticate(code: string): Promise<ApiAuthResponse> {
    return axios
      .post(
        Api.BASE_URL + '/api/auth',
        { totp: code },
        { headers: { 'content-type': 'application/json' } }
      )
      .then((res) => {
        if (!res.data?.token)
          return Promise.reject(
            Api.fail_from_error(undefined, 'Failed to receive JWT')
          );
        this.token = res.data.token;
        return Api.success_from_data(res.data) as ApiGetAuthResponse;
      })
      .catch((err) => Promise.reject<ApiResponse>(Api.fail_from_error(err)));
  }

  public upload(blob: ArrayBuffer): Promise<ApiUploadResponse> {
    return axios
      .post(Api.BASE_URL + '/api/files/upload', blob, {
        headers: {
          'Content-Type': 'application/octet-stream',
          Authorization: `Bearer ${this.token}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        responseType: 'json',
      })
      .then((res) => {
        if (!res.data?.id)
          return Promise.reject(
            Api.fail_from_error(undefined, 'Failed to upload file ID')
          );
        return Api.success_from_data(res.data) as ApiUploadResponse;
      })
      .catch((err) => Promise.reject<ApiResponse>(Api.fail_from_error(err)));
  }

  public download(id: string): Promise<ApiDownloadResponse> {
    return axios
      .get(`${Api.BASE_URL}/api/files/download/${id}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        responseType: 'arraybuffer',
      })
      .then((res) => {
        if (!res.data)
          return Promise.reject(
            Api.fail_from_error(undefined, 'Failed to download data')
          );
        return Api.success_from_data({ data: res.data }) as ApiDownloadResponse;
      })
      .catch((err) =>
        Promise.reject(
          Api.fail_from_error(
            err,
            err?.response?.status == 404 ? 'ID not found' : 'Failure'
          ) as ApiDownloadResponse
        )
      );
  }

  public config(): Promise<ApiConfigResponse> {
    return axios
      .get(Api.BASE_URL + '/api/config', {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        responseType: 'json',
      })
      .then((res) => Api.success_from_data(res.data) as ApiConfigResponse)
      .catch((err) => Promise.reject<ApiResponse>(Api.fail_from_error(err)));
  }
}
