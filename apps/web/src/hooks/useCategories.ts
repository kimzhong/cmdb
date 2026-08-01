import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { categoriesApi } from '@/api/categories';
import type { Category } from '@cmdb/shared';

const KEY = ['meta-model', 'categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => categoriesApi.list(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof categoriesApi.create>[0]) =>
      categoriesApi.create(data),
    onSuccess: () => {
      message.success('创建成功');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: { message?: string }) => {
      message.error(e.message || '创建失败');
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      message.success('删除成功');
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e: { message?: string }) => {
      message.error(e.message || '删除失败');
    },
  });
}

export function confirmDelete(_message: string) {
  return new Promise<boolean>((resolve) => {
    // 占位：保留供后续扩展（当前未使用）
    resolve(true);
  });
}

export type { Category };
