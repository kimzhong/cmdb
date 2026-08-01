import { http } from './client';

export interface SearchHit {
  modelUid: string;
  _id: string;
  uid?: string;
  name?: string;
  score: number;
  raw: Record<string, unknown>;
}

export const searchApi = {
  global: (params: { keyword: string; modelUid?: string; limit?: number }) =>
    http.get<SearchHit[]>('/search', { params }),
};
