import { http } from './client';

export const ipamApi = {
  listSubnets: (filter: { scope?: string; environment?: string } = {}) =>
    http.get('/ipam/subnets', { params: filter }),
  getSubnet: (id: string) => http.get(`/ipam/subnets/${id}`),
  getSubnetUsage: (id: string) => http.get(`/ipam/subnets/${id}/usage`),
  listAddresses: (id: string, filter: { status?: string; page?: number; pageSize?: number } = {}) =>
    http.get(`/ipam/subnets/${id}/addresses`, { params: filter }),
  createSubnet: (dto: any) => http.post('/ipam/subnets', dto),
  allocate: (dto: { subnetId: string; ip: string; resourceId: string; actor: string }) =>
    http.post('/ipam/allocate', dto),
  release: (dto: { subnetId: string; ip: string; actor: string }) => http.post('/ipam/release', dto),
  listConflicts: () => http.get('/ipam/conflicts'),
};
