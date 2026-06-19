import type { PlatformId } from '@shared/types/platform';
import type { PlatformAdapter } from './PlatformAdapter';
import { facebookAdapter } from './facebook';
import { kijijiAdapter } from './kijiji';

const adapters: Record<PlatformId, PlatformAdapter> = {
  facebook: facebookAdapter,
  kijiji: kijijiAdapter,
};

export function getAdapter(platform: PlatformId): PlatformAdapter {
  return adapters[platform];
}

export function allAdapters(): PlatformAdapter[] {
  return Object.values(adapters);
}
