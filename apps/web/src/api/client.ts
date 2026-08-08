/**
 * API 客户端
 *
 * 后端用 TransformInterceptor 把响应包成 {code, message, data, timestamp}
 * 此处用 helpers 显式 unwrap,让调用点拿到的就是 data 部分
 */
import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type { ApiResponse } from '@cmdb/shared';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const _http: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
});

_http.interceptors.request.use((config) => {
  const token = localStorage.getItem('cmdb.token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

_http.interceptors.response.use(
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
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
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

/**
 * HTTP helpers - 显式返回 unwrap 后的 data
 * 用法: apiGet<MyType>('/users/1') -> Promise<MyType>
 */
async function apiGet<T = any>(url: string, config?: any): Promise<T> {
  return _http.get(url, config) as unknown as Promise<T>;
}
async function apiPost<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return _http.post(url, data, config) as unknown as Promise<T>;
}
async function apiPut<T = any>(url: string, data?: any, config?: any): Promise<T> {
  return _http.put(url, data, config) as unknown as Promise<T>;
}
async function apiDelete<T = any>(url: string, config?: any): Promise<T> {
  return _http.delete(url, config) as unknown as Promise<T>;
}

/**
 * 兼容旧代码: http.get/post/put/delete 直接用
 * 类型上是 any(因为 unwrap 后类型不固定)
 */
export const http = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPut, // v0.1 用 patch,共享同实现
  delete: apiDelete,
};

export type { ApiResponse };
