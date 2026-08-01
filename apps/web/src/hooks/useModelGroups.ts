import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { modelGroupsApi, type ModelGroup } from '@/api/modelGroups';

const KEY = (categoryId?: string) => ['meta-model', 'model-groups', categoryId ?? 'all'] as const;

export function useModelGroups(categoryId?: string) {
  return useQuery({
    queryKey: KEY(categoryId),
    queryFn: () => modelGroupsApi.list({ categoryId }),
  });
}

export function useCreateModelGroup(_categoryId?: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof modelGroupsApi.create>[0]) =>
      modelGroupsApi.create(data),
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: ['meta-model', 'model-groups'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '创建失败'),
  });
}

export function useDeleteModelGroup(_categoryId?: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => modelGroupsApi.remove(id),
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: ['meta-model', 'model-groups'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '删除失败'),
  });
}

export type { ModelGroup };
