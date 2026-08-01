import { http } from './client';

export interface ModelGroup {
  _id: string;
  categoryId: string;
  uid: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const modelGroupsApi = {
  list: (params?: { categoryId?: string }) =>
    http.get<ModelGroup[]>('/meta-model/model-groups', { params }),
  detail: (id: string) => http.get<ModelGroup>(`/meta-model/model-groups/${id}`),
  create: (data: Pick<ModelGroup, 'categoryId' | 'uid' | 'name' | 'order'>) =>
    http.post<ModelGroup>('/meta-model/model-groups', data),
  update: (id: string, data: Partial<ModelGroup>) =>
    http.patch<ModelGroup>(`/meta-model/model-groups/${id}`, data),
  remove: (id: string) => http.delete<{ id: string }>(`/meta-model/model-groups/${id}`),
};
