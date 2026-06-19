import { useQuery } from '@tanstack/react-query';
import type { AdFilter } from '@shared/types/ad';

export function useAds(filter: AdFilter) {
  return useQuery({
    queryKey: ['ads', filter],
    queryFn: () => window.marketplace.listAds(filter),
  });
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => window.marketplace.platformHealth(),
    refetchInterval: 30_000,
  });
}
