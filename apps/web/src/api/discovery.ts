import { http } from './client';

export const discoveryApi = {
  listTasks: (filter: { protocol?: string; enabled?: boolean } = {}) =>
    http.get('/discovery/tasks', { params: filter }),
  getTask: (id: string) => http.get(`/discovery/tasks/${id}`),
  createTask: (dto: any) => http.post('/discovery/tasks', dto),
  updateTask: (id: string, dto: any) => http.put(`/discovery/tasks/${id}`, dto),
  removeTask: (id: string) => http.delete(`/discovery/tasks/${id}`),
  runTask: (id: string) => http.post(`/discovery/tasks/${id}/run`),
  listRuns: (id: string, limit = 20) => http.get(`/discovery/tasks/${id}/runs`, { params: { limit } }),
  getRun: (runId: string) => http.get(`/discovery/runs/${runId}`),
};
