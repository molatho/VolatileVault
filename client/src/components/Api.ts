import axios from 'axios'

export interface ApiResponse {
    success: boolean;
    message: string;
}

export interface ApiGetAuthResponse extends ApiResponse {
    token?: string;
}

export interface ApiAuthResponse extends ApiResponse {
    id?: string;
    creationDate?: Date;
}

export default class Api {
    private token?: string = undefined;
    private static BASE_URL: string = process.env.REACT_APP_BASE_URL ?? "";

    private static fail_from_error(error: any, defaultMessage: string = "Failure") : ApiResponse {
        return { success: false, message: error?.response?.data?.message ?? defaultMessage }
    }

    private static success_from_data(data: any) : ApiResponse {
        return { ...data, success: true }
    }

    public isAuthenticated(): Promise<ApiGetAuthResponse> {
        return axios.get(Api.BASE_URL + "/api/auth")
            .then((res) => Api.success_from_data(res.data) as ApiGetAuthResponse)
            .catch((err) => Promise.reject<ApiResponse>(Api.fail_from_error(err, "Unauthorized")))
    }

    public authenticate(code: string): Promise<ApiAuthResponse> {
        return axios.post(Api.BASE_URL + "/api/auth", { totp: code }, { headers: { "content-type": "application/json" } })
            .then((res) => {
                if (res.data?.token)
                    this.token = res.data.token;
                return Api.success_from_data(res.data) as ApiGetAuthResponse;
            })
            .catch((err) => Promise.reject<ApiResponse>(Api.fail_from_error(err)))
    }
}