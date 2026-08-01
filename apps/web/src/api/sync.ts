import { http } from './client';

export interface SyncTask {
  _id: string;
  name: string;
  provider: string;
  modelUid: string;
  cron: string;
  syncMode: 'full' | 'incremental';
  region?: string;
  resourceType?: string;
  fieldMapping: Array<{ remote: string; local: string }>;
  uniqueKey: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRunAt?: string;
  enabled: boolean;
}

export interface SyncLog {
  _id: string;
  taskId: string;
  startedAt: string;
  finishedAt?: string;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  status: string;
  error?: string;
}

export const syncApi = {
  listTasks: () => http.get<SyncTask[]>('/sync/tasks'),
  createTask: (data: Partial<SyncTask>) => http.post<SyncTask>('/sync/tasks', data),
  updateTask: (id: string, data: Partial<SyncTask>) =>
    http.patch<SyncTask>(`/sync/tasks/${id}`, data),
  removeTask: (id: string) => http.delete<{ id: string }>(`/sync/tasks/${id}`),
  trigger: (id: string) => http.post<{ logId: string }>(`/sync/tasks/${id}/trigger`),
  listLogs: (params: { taskId?: string; page?: number; pageSize?: number }) =>
    http.get<{ list: SyncLog[]; total: number; page: number; pageSize: number }>('/sync/logs', { params }),
};
