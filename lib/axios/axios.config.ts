import { AxiosError, AxiosResponse } from "axios";
import axiosConfig from "./config.axios";

export async function getRequest<T = any>(
  URL: string,
  params?: any
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .get<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`, { params })
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch(async (error: AxiosError) => {
      const { response, message } = error as any;
      const errorMessage = response?.data?.message || message || error;
      throw new Error(errorMessage);
    });
}

export async function postRequest<T = any>(
  URL: string,
  payload: any,
  options?: any
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .post<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`, payload, {
      headers: { "Content-Type": "application/json", ...options },
    })
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch((error: any) => {
      throw new Error(error?.response?.data?.message);
    });
}

export async function putRequest<T = any>(
  URL: string,
  payload: any,
  options?: any
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .put<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`, payload, {
      headers: { "Content-Type": "application/json" },
    })
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch((error: any) => {
      throw new Error(error?.response?.data?.message);
    });
}

export async function deleteRequestClient<T = any>(
  URL: string
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .delete<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`)
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch((error: AxiosError) => {
      const { response, message } = error as any;
      const errorMessage = response?.data?.message || message || error;
      throw new Error(errorMessage);
    });
}

export async function postFormDataRequest<T = any>(
  URL: string,
  formData: any
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .post<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch((error: any) => {
      throw new Error(error?.response?.data?.message);
    });
}

export async function putFormDataRequest<T = any>(
  URL: string,
  formData: any
): Promise<AxiosResponse<T>> {
  return axiosConfig
    .put<T>(`${process.env.NEXT_PUBLIC_BASE_API_URL}${URL}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((response: AxiosResponse<T>) => {
      return response;
    })
    .catch((error: any) => {
      throw new Error(error?.response?.data?.message);
    });
}
