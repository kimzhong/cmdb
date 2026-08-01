import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/api/search';

export function useGlobalSearch(params: { keyword: string; modelUid?: string; limit?: number }) {
  return useQuery({
    queryKey: ['search', 'global', params],
    queryFn: () => searchApi.global(params),
    enabled: !!params.keyword,
  });
}
