import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { tagsApi } from '@/api/tags';

const KEYS_KEY = ['tags', 'keys'] as const;
const VALUES_KEY = (keyId?: string) => ['tags', 'values', keyId ?? 'all'] as const;

export function useTagKeys() {
  return useQuery({ queryKey: KEYS_KEY, queryFn: () => tagsApi.listKeys() });
}
export function useTagValues(keyId?: string) {
  return useQuery({ queryKey: VALUES_KEY(keyId), queryFn: () => tagsApi.listValues(keyId) });
}
export function useCreateTagKey() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof tagsApi.createKey>[0]) => tagsApi.createKey(data),
    onSuccess: () => {
      message.success('标签键已创建');
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useDeleteTagKey() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => tagsApi.removeKey(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useCreateTagValue() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof tagsApi.createValue>[0]) => tagsApi.createValue(data),
    onSuccess: () => {
      message.success('标签值已创建');
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useDeleteTagValue() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => tagsApi.removeValue(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useTagSearch() {
  return useMutation({
    mutationFn: (data: Parameters<typeof tagsApi.search>[0]) => tagsApi.search(data),
  });
}
