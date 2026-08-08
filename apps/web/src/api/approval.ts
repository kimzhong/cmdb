import { http } from './client';

export const approvalApi = {
  list: (filter: { status?: string; requesterId?: string; type?: string; mine?: boolean } = {}) =>
    http.get('/approvals', { params: filter }),
  get: (id: string) => http.get(`/approvals/${id}`),
  create: (dto: any) => http.post('/approvals', dto),
  approve: (id: string, dto: { approverId: string; approverName: string; comment: string }) =>
    http.post(`/approvals/${id}/approve`, dto),
  reject: (id: string, dto: { approverId: string; approverName: string; comment: string }) =>
    http.post(`/approvals/${id}/reject`, dto),
  cancel: (id: string, actorId: string) => http.post(`/approvals/${id}/cancel`, { actorId }),
  apply: (id: string, dto: { success: boolean; error?: string }) => http.post(`/approvals/${id}/apply`, dto),
  // 策略
  listPolicies: () => http.get('/approval-policies'),
  createPolicy: (dto: any) => http.post('/approval-policies', dto),
  updatePolicy: (id: string, dto: any) => http.put(`/approval-policies/${id}`, dto),
  deletePolicy: (id: string) => http.delete(`/approval-policies/${id}`),
};
