import { http } from './client';

export const reportingApi = {
  summary: () => http.get('/reports/summary'),
  lifecycleDistribution: () => http.get('/reports/lifecycle-distribution'),
  approvalPending: () => http.get('/reports/approval-pending'),
  ipamUsage: () => http.get('/reports/ipam-usage'),
  discoveryStats: () => http.get('/reports/discovery-stats'),
};
