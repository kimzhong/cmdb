import { http } from './client';
import type { FieldType, RelationType } from '@cmdb/shared';

export interface FieldOption {
  key: string;
  value: string;
}

export interface FieldDef {
  uid: string;
  name: string;
  type: FieldType;
  groupUid: string;
  order: number;
  required: boolean;
  builtin: boolean;
  regex?: string;
  options?: FieldOption[];
  relationType?: RelationType;
  targetModelUid?: string;
}

export interface FieldGroup {
  uid: string;
  name: string;
  order: number;
  builtin: boolean;
}

export interface Model {
  _id: string;
  categoryId: string;
  groupId: string;
  uid: string;
  name: string;
  description?: string;
  order: number;
  fieldGroups: FieldGroup[];
  fields: FieldDef[];
  createdAt: string;
  updatedAt: string;
}

export const modelsApi = {
  list: (params?: { categoryId?: string; groupId?: string }) =>
    http.get<Model[]>('/meta-model/models', { params }),
  detail: (id: string) => http.get<Model>(`/meta-model/models/${id}`),
  byUid: (uid: string) => http.get<Model>(`/meta-model/models/uid/${uid}`),
  create: (data: Partial<Model>) => http.post<Model>('/meta-model/models', data),
  update: (id: string, data: Partial<Model>) => http.patch<Model>(`/meta-model/models/${id}`, data),
  remove: (id: string) => http.delete<{ id: string }>(`/meta-model/models/${id}`),

  addFieldGroup: (id: string, data: { uid: string; name: string; order?: number }) =>
    http.post<Model>(`/meta-model/models/${id}/field-groups`, data),
  removeFieldGroup: (id: string, groupUid: string) =>
    http.delete<{ id: string; groupUid: string }>(`/meta-model/models/${id}/field-groups/${groupUid}`),

  addField: (id: string, data: Partial<FieldDef>) =>
    http.post<Model>(`/meta-model/models/${id}/fields`, data),
  updateField: (id: string, fieldUid: string, data: Partial<FieldDef>) =>
    http.patch<Model>(`/meta-model/models/${id}/fields/${fieldUid}`, data),
  removeField: (id: string, fieldUid: string) =>
    http.delete<{ id: string; fieldUid: string }>(`/meta-model/models/${id}/fields/${fieldUid}`),
};
