import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../store/toastStore';
import type { NotificationPayload } from '@shared/types/ipc';

export function useEvents() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === 'undefined' || !window.marketplace) return;
    const events = window.marketplaceEvents;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      window.marketplace.on(events.AdUpdated, () => {
        void qc.invalidateQueries({ queryKey: ['ads'] });
      }),
      window.marketplace.on(events.ScanComplete, () => {
        void qc.invalidateQueries({ queryKey: ['ads'] });
        void qc.invalidateQueries({ queryKey: ['health'] });
        void qc.invalidateQueries({ queryKey: ['stats'] });
      }),
      window.marketplace.on(events.PlatformHealthChanged, () => {
        void qc.invalidateQueries({ queryKey: ['health'] });
      }),
      window.marketplace.on(events.Notification, (raw) => {
        const n = raw as NotificationPayload;
        const message = n.body ? `${n.title} — ${n.body}` : n.title;
        switch (n.level) {
          case 'info':  toast.info(message); break;
          case 'warn':  toast.warn(message); break;
          case 'error': toast.error(message); break;
          default:      toast.info(message);
        }
      }),
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [qc]);
}
