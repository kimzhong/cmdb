import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { modelsApi, type Model, type FieldDef } from '@/api/models';

const KEY = (params?: { categoryId?: string; groupId?: string }) =>
  ['meta-model', 'models', params ?? {}] as const;
const DETAIL_KEY = (id: string) => ['meta-model', 'model', id] as const;

export function useModels(params?: { categoryId?: string; groupId?: string }) {
  return useQuery({ queryKey: KEY(params), queryFn: () => modelsApi.list(params) });
}

export function useModel(id: string) {
  return useQuery({ queryKey: DETAIL_KEY(id), queryFn: () => modelsApi.detail(id), enabled: !!id });
}

export function useCreateModel() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof modelsApi.create>[0]) => modelsApi.create(data),
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: ['meta-model', 'models'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '创建失败'),
  });
}

export function useDeleteModel() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => modelsApi.remove(id),
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: ['meta-model', 'models'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '删除失败'),
  });
}

export function useAddField(modelId: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Partial<FieldDef>) => modelsApi.addField(modelId, data),
    onSuccess: () => {
      message.success('字段已添加');
      qc.invalidateQueries({ queryKey: DETAIL_KEY(modelId) });
    },
    onError: (e: { message?: string }) => message.error(e.message || '添加失败'),
  });
}

export function useRemoveField(modelId: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (fieldUid: string) => modelsApi.removeField(modelId, fieldUid),
    onSuccess: () => {
      message.success('字段已删除');
      qc.invalidateQueries({ queryKey: DETAIL_KEY(modelId) });
    },
    onError: (e: { message?: string }) => message.error(e.message || '删除失败'),
  });
}

export function useAddFieldGroup(modelId: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: { uid: string; name: string; order?: number }) =>
      modelsApi.addFieldGroup(modelId, data),
    onSuccess: () => {
      message.success('字段分组已添加');
      qc.invalidateQueries({ queryKey: DETAIL_KEY(modelId) });
    },
    onError: (e: { message?: string }) => message.error(e.message || '添加失败'),
  });
}

export function useRemoveFieldGroup(modelId: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (groupUid: string) => modelsApi.removeFieldGroup(modelId, groupUid),
    onSuccess: () => {
      message.success('字段分组已删除');
      qc.invalidateQueries({ queryKey: DETAIL_KEY(modelId) });
    },
    onError: (e: { message?: string }) => message.error(e.message || '删除失败'),
  });
}

export type { Model };
