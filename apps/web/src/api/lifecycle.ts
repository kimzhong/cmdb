import { http } from './client';

export const lifecycleApi = {
  nextStates: (modelUid: string, id: string) => http.get(`/resources/${modelUid}/${id}/lifecycle/next-states`),
  transition: (modelUid: string, id: string, dto: { to: string; reason?: string; actor: string }) =>
    http.post(`/resources/${modelUid}/${id}/lifecycle/transition`, dto),
  restore: (modelUid: string, id: string, actor: string) =>
    http.post(`/resources/${modelUid}/${id}/restore`, { actor }),
  purge: (modelUid: string, id: string) => http.delete(`/resources/${modelUid}/${id}/purge`),
  // 回收站
  trash: (filter: { page?: number; pageSize?: number; modelUid?: string } = {}) =>
    http.get('/trash', { params: filter }),
};
