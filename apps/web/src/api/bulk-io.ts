import { http } from './client';

export const bulkIoApi = {
  // 模板
  getTemplate: (modelUid: string) => http.get(`/bulk-io/templates/${modelUid}/json`),
  downloadTemplate: (modelUid: string) => http.get(`/bulk-io/templates/${modelUid}`, { responseType: 'blob' }),
  // 导入
  createImport: (dto: any) => http.post('/bulk-io/imports', dto),
  getImport: (id: string) => http.get(`/bulk-io/imports/${id}`),
  listImports: (filter: { modelUid?: string; status?: string } = {}) =>
    http.get('/bulk-io/imports', { params: filter }),
  // 导出
  createExport: (dto: any) => http.post('/bulk-io/exports', dto),
  getExport: (id: string) => http.get(`/bulk-io/exports/${id}`),
  listExports: () => http.get('/bulk-io/exports').catch(() => []),
  downloadExport: (id: string) => http.get(`/bulk-io/exports/${id}/download`, { responseType: 'blob' }),
};
