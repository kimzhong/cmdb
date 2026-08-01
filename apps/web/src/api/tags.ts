import { http } from './client';

export interface TagKey {
  _id: string;
  uid: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagValue {
  _id: string;
  keyId: string;
  value: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceWithTags {
  modelUid: string;
  resources: Array<{ _id: string; bindings: string[] }>;
}

export const tagsApi = {
  listKeys: () => http.get<TagKey[]>('/tags/keys'),
  createKey: (data: { uid: string; name: string; description?: string }) =>
    http.post<TagKey>('/tags/keys', data),
  removeKey: (id: string) => http.delete<{ id: string }>(`/tags/keys/${id}`),

  listValues: (keyId?: string) =>
    http.get<TagValue[]>('/tags/values', { params: keyId ? { keyId } : undefined }),
  createValue: (data: { keyId: string; value: string; description?: string }) =>
    http.post<TagValue>('/tags/values', data),
  removeValue: (id: string) => http.delete<{ id: string }>(`/tags/values/${id}`),

  bind: (valueId: string, resources: Array<{ modelUid: string; resourceId: string }>) =>
    http.post<{ bound: number }>(`/tags/values/${valueId}/bind`, { resources }),
  unbind: (valueId: string, modelUid: string, resourceId: string) =>
    http.delete<unknown>(`/tags/values/${valueId}/bind`, { params: { modelUid, resourceId } }),

  getResourceTags: (modelUid: string, resourceId: string) =>
    http.get<Array<{ value: TagValue; key: TagKey }>>('/tags/resource-tags', {
      params: { modelUid, resourceId },
    }),

  search: (data: { tagValueIds: string[]; modelUid?: string }) =>
    http.post<ResourceWithTags[]>('/tags/search', data),
};
