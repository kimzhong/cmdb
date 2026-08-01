import { http } from './client';

export interface PaginatedResources<T = Record<string, unknown>> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const resourcesApi = {
  list: (
    modelUid: string,
    params?: { page?: number; pageSize?: number; keyword?: string },
  ) => http.get<PaginatedResources>(`/resources/${modelUid}`, { params }),
  detail: (modelUid: string, id: string) =>
    http.get<Record<string, unknown>>(`/resources/${modelUid}/${id}`),
  create: (modelUid: string, body: Record<string, unknown>) =>
    http.post<Record<string, unknown>>(`/resources/${modelUid}`, body),
  update: (modelUid: string, id: string, body: Record<string, unknown>) =>
    http.patch<Record<string, unknown>>(`/resources/${modelUid}/${id}`, body),
  remove: (modelUid: string, id: string) =>
    http.delete<{ id: string }>(`/resources/${modelUid}/${id}`),
  batchRemove: (modelUid: string, ids: string[]) =>
    http.post<{ deleted: number }>(`/resources/${modelUid}/batch-delete`, { ids }),
};
