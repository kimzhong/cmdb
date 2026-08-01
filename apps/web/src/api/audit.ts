import { http } from './client';

export interface AuditLog {
  _id: string;
  username?: string;
  method: string;
  path: string;
  status: number;
  body?: string;
  ip?: string;
  durationMs: number;
  createdAt?: string;
  updatedAt?: string;
}

export const auditApi = {
  list: (params?: { username?: string; path?: string; page?: number; pageSize?: number }) =>
    http.get<{ list: AuditLog[]; total: number; page: number; pageSize: number }>(
      '/audit/logs',
      { params },
    ),
};
