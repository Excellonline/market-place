import { useEffect, useState } from 'react';
import type { PlatformId } from '@shared/types/platform';
import type { ScanProgressPayload, ScanCompletePayload } from '@shared/types/ipc';

interface PlatformScanState {
  active: boolean;
  step: ScanProgressPayload['step'] | 'idle' | 'done';
  current: number;
  total: number;
  errorMessage: string | null;
  finishedAt: number | null;
}

const emptyState = (): PlatformScanState => ({
  active: false,
  step: 'idle',
  current: 0,
  total: 0,
  errorMessage: null,
  finishedAt: null,
});

export function useScanProgress() {
  const [byPlatform, setByPlatform] = useState<Record<PlatformId, PlatformScanState>>({
    facebook: emptyState(),
    kijiji: emptyState(),
  });

  useEffect(() => {
    const events = window.marketplaceEvents;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      window.marketplace.on(events.ScanProgress, (raw) => {
        const p = raw as ScanProgressPayload;
        setByPlatform((s) => ({
          ...s,
          [p.platform]: {
            active: true,
            step: p.step,
            current: p.current,
            total: p.total,
            errorMessage: null,
            finishedAt: null,
          },
        }));
      }),
      window.marketplace.on(events.ScanComplete, (raw) => {
        const p = raw as ScanCompletePayload;
        setByPlatform((s) => ({
          ...s,
          [p.platform]: {
            ...s[p.platform],
            active: false,
            step: 'done',
            errorMessage: p.errorMessage,
            finishedAt: Date.now(),
          },
        }));
      }),
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  return byPlatform;
}
