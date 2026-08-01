import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { resourcesApi } from '@/api/resources';

const KEY = (modelUid: string, params?: { page?: number; pageSize?: number; keyword?: string }) =>
  ['resources', modelUid, params ?? {}] as const;

export function useResources(
  modelUid: string,
  params?: { page?: number; pageSize?: number; keyword?: string },
) {
  return useQuery({
    queryKey: KEY(modelUid, params),
    queryFn: () => resourcesApi.list(modelUid, params),
    enabled: !!modelUid,
  });
}

export function useResourceDetail(modelUid: string, id: string) {
  return useQuery({
    queryKey: ['resources', modelUid, 'detail', id],
    queryFn: () => resourcesApi.detail(modelUid, id),
    enabled: !!modelUid && !!id,
  });
}

export function useCreateResource(modelUid: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => resourcesApi.create(modelUid, body),
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: ['resources', modelUid] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '创建失败'),
  });
}

export function useUpdateResource(modelUid: string, id: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => resourcesApi.update(modelUid, id, body),
    onSuccess: () => {
      message.success('更新成功');
      qc.invalidateQueries({ queryKey: ['resources', modelUid] });
      qc.invalidateQueries({ queryKey: ['resources', modelUid, 'detail', id] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '更新失败'),
  });
}

export function useDeleteResource(modelUid: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => resourcesApi.remove(modelUid, id),
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: ['resources', modelUid] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '删除失败'),
  });
}

export function useBatchDelete(modelUid: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (ids: string[]) => resourcesApi.batchRemove(modelUid, ids),
    onSuccess: (res) => {
      message.success(`已删除 ${res.deleted} 条`);
      qc.invalidateQueries({ queryKey: ['resources', modelUid] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '批量删除失败'),
  });
}
