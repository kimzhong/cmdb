import { http } from './client';

export const modelTemplatesApi = {
  list: () => http.get('/model-templates'),
  get: (code: string) => http.get(`/model-templates/${code}`),
  import: (code: string, actor: string) => http.post(`/model-templates/${code}/import`, { actor }),
};
