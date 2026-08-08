import { http } from './client';

export const relationsApi = {
  list: (filter: any = {}) => http.get('/relations', { params: filter }),
  get: (id: string) => http.get(`/relations/${id}`),
  create: (dto: any) => http.post('/relations', dto),
  remove: (id: string) => http.delete(`/relations/${id}`),
  // 图谱
  graph: (rootId: string, rootType: string, opts: { direction?: 'up' | 'down' | 'both'; maxDepth?: number; relationTypes?: string } = {}) =>
    http.get('/relations/graph', { params: { rootId, rootType, ...opts } }),
  path: (fromId: string, fromType: string, toId: string, toType: string, opts: { maxDepth?: number } = {}) =>
    http.get('/relations/path', { params: { fromId, fromType, toId, toType, ...opts } }),
  impact: (rootId: string, rootType: string, opts: { maxDepth?: number } = {}) =>
    http.get('/relations/impact', { params: { rootId, rootType, ...opts } }),
  // 关系类型
  listTypes: () => http.get('/relation-types'),
  createType: (dto: any) => http.post('/relation-types', dto),
  removeType: (code: string) => http.delete(`/relation-types/${code}`),
};
