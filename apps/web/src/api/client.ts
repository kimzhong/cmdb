import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { ApiResponse } from '@cmdb/shared';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('cmdb.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code !== 0) {
        return Promise.reject({
          code: body.code,
          message: body.message,
          status: response.status,
        });
      }
      return body.data;
    }
    return response.data;
  },
  (error: AxiosError<{ message?: string; code?: number }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '请求失败';

    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('cmdb.token');
      // 用 history pushState 触发 react-router 拦截（避免硬刷导致状态丢失）
      if (window.location.pathname !== '/login') {
        window.history.pushState({}, '', '/login');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }

    return Promise.reject({
      code: error.response?.data?.code ?? status ?? -1,
      message,
      status,
    });
  },
);

export type { ApiResponse };
