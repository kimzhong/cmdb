import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { appsApi } from '@/api/apps';

const BIZ_KEY = ['apps', 'biz'] as const;
const APP_KEY = (bizId?: string) => ['apps', 'app', bizId ?? 'all'] as const;
const APP_RES_KEY = (appId: string, env?: string) => ['apps', 'app', appId, 'resources', env ?? 'all'] as const;

export function useBiz() {
  return useQuery({ queryKey: BIZ_KEY, queryFn: () => appsApi.listBiz() });
}
export function useAppList(bizId?: string) {
  return useQuery({ queryKey: APP_KEY(bizId), queryFn: () => appsApi.listApp(bizId) });
}
export function useAppResources(appId: string, env?: string, modelUid?: string) {
  return useQuery({
    queryKey: APP_RES_KEY(appId, env).concat(modelUid ?? ''),
    queryFn: () => appsApi.appResources(appId, { env, modelUid }),
    enabled: !!appId,
  });
}
export function useCreateBiz() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof appsApi.createBiz>[0]) => appsApi.createBiz(data),
    onSuccess: () => {
      message.success('业务已创建');
      qc.invalidateQueries({ queryKey: BIZ_KEY });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useCreateApp() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (data: Parameters<typeof appsApi.createApp>[0]) => appsApi.createApp(data),
    onSuccess: () => {
      message.success('应用已创建');
      qc.invalidateQueries({ queryKey: ['apps', 'app'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useRemoveApp() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => appsApi.removeApp(id),
    onSuccess: () => {
      message.success('已删除');
      qc.invalidateQueries({ queryKey: ['apps'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
export function useBindAppResources(appId: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (resources: Array<{ modelUid: string; resourceId: string }>) =>
      appsApi.bindResources(appId, resources),
    onSuccess: (res) => {
      message.success(`已绑定 ${res.bound} 个资源`);
      qc.invalidateQueries({ queryKey: ['apps', 'app'] });
    },
    onError: (e: { message?: string }) => message.error(e.message || '失败'),
  });
}
