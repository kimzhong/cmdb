import { http } from './client';
import type { Category } from '@cmdb/shared';

export const categoriesApi = {
  list: () => http.get<Category[]>('/meta-model/categories'),
  detail: (id: string) => http.get<Category>(`/meta-model/categories/${id}`),
  create: (data: Pick<Category, 'uid' | 'name' | 'icon' | 'order'>) =>
    http.post<Category>('/meta-model/categories', data),
  update: (id: string, data: Partial<Category>) =>
    http.patch<Category>(`/meta-model/categories/${id}`, data),
  remove: (id: string) => http.delete<{ id: string }>(`/meta-model/categories/${id}`),
};
