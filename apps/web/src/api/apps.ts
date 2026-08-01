import { http } from './client';

export interface Biz {
  _id: string;
  uid: string;
  name: string;
  description?: string;
  order: number;
}

export interface App {
  _id: string;
  bizId: string;
  uid: string;
  name: string;
  status: string;
  description?: string;
}

export interface AppResourceDetail {
  app: App;
  byModel: Array<{ modelUid: string; resources: Array<Record<string, unknown>> }>;
}

export const appsApi = {
  listBiz: () => http.get<Biz[]>('/apps/biz'),
  createBiz: (data: { uid: string; name: string; description?: string; order?: number }) =>
    http.post<Biz>('/apps/biz', data),
  removeBiz: (id: string) => http.delete<{ id: string }>(`/apps/biz/${id}`),

  listApp: (bizId?: string) =>
    http.get<App[]>('/apps/app', { params: bizId ? { bizId } : undefined }),
  detailApp: (id: string) => http.get<App>(`/apps/app/${id}`),
  createApp: (data: { bizId: string; uid: string; name: string; status?: string; description?: string }) =>
    http.post<App>('/apps/app', data),
  removeApp: (id: string) => http.delete<{ id: string }>(`/apps/app/${id}`),

  bindResources: (appId: string, resources: Array<{ modelUid: string; resourceId: string }>) =>
    http.post<{ bound: number }>(`/apps/app/${appId}/resources`, { resources }),
  unbindResource: (appId: string, modelUid: string, resourceId: string) =>
    http.delete<unknown>(`/apps/app/${appId}/resources`, { params: { modelUid, resourceId } }),
  appResources: (appId: string, params: { env?: string; modelUid?: string }) =>
    http.get<AppResourceDetail>(`/apps/app/${appId}/resources`, { params }),
};
