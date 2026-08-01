import { http } from './client';

export interface HealthResult {
  status: string;
  info?: Record<string, { status: string }>;
  error?: Record<string, { status: string; message?: string }>;
  details?: Record<string, unknown>;
}

export const healthApi = {
  check: () => http.get<HealthResult>('/health'),
};
