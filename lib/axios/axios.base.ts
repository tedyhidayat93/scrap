import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveToken,
  clearAuthCookies,
} from "@/utils/cookieUtils";

const axiosConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL,
  // timeout: TIMEOUT_REQUEST,
  // timeoutErrorMessage: TIMEOUT_MESSAGE,
});

// Attach access token from cookies on every request
const requestHandler = (request: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (!request.headers) request.headers = new AxiosHeaders();
  if (token) request.headers.set("Authorization", `Bearer ${token}`);
  return request;
};

const responseHandler = (response: AxiosResponse<any, any>) => {
  // if (response.status === HttpStatusCode.Unauthorized) {
  //   window.location.href = '/';
  // }

  return response;
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  config: InternalAxiosRequestConfig & { _retry?: boolean };
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      if (!prom.config.headers) prom.config.headers = new AxiosHeaders();
      if (token) prom.config.headers.set("Authorization", `Bearer ${token}`);
      prom.resolve(axiosConfig(prom.config));
    }
  });
  failedQueue = [];
};

const errorHandler = async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & {
    _retry?: boolean;
  };
  const status = error.response?.status;

  if (status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;

    if (isRefreshing) {
      // Queue the request while refreshing
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      });
    }

    isRefreshing = true;
    const refresh_token = getRefreshToken();

    if (!refresh_token) {
      clearAuthCookies();
      if (typeof window !== "undefined") window.location.href = "/login";
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/auth/token/refresh`,
        { refresh_token }
      );
      const data = resp.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
      };
      // Persist new tokens
      saveToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token || refresh_token,
        expires_in: data.expires_in || 0,
        token_type: (data as any).token_type || "bearer",
      });

      const newToken = data.access_token;
      processQueue(null, newToken);
      isRefreshing = false;

      // Retry original request with new token
      if (!originalRequest.headers)
        originalRequest.headers = new AxiosHeaders();
      originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
      return axiosConfig(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as any, null);
      isRefreshing = false;
      clearAuthCookies();
      if (typeof window !== "undefined") window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
};

axiosConfig.interceptors.request.use(requestHandler, errorHandler);

axiosConfig.interceptors.response.use(responseHandler, errorHandler);

export default axiosConfig;
