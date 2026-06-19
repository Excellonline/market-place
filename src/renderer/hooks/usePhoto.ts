import { useQuery } from '@tanstack/react-query';

export function usePhoto(hash: string | null | undefined) {
  return useQuery({
    queryKey: ['photo', hash],
    queryFn: () => (hash ? window.marketplace.getPhotoDataUrl(hash) : Promise.resolve(null)),
    enabled: !!hash,
    staleTime: 1000 * 60 * 30,
  });
}

export function useThumb(hash: string | null | undefined) {
  return useQuery({
    queryKey: ['thumb', hash],
    queryFn: () => (hash ? window.marketplace.getThumbDataUrl(hash) : Promise.resolve(null)),
    enabled: !!hash,
    staleTime: 1000 * 60 * 60,
  });
}
