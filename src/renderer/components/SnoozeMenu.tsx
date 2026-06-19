import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellOff, BellRing, Clock, Check } from 'lucide-react';

const PRESETS: Array<{ label: string; hours: number }> = [
  { label: '1 hour', hours: 1 },
  { label: '8 hours', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

interface Props {
  adId: string;
  snoozedUntil: number | null;
  compact?: boolean;
}

export function SnoozeMenu({ adId, snoozedUntil, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const snoozeMut = useMutation({
    mutationFn: (until: number | null) => window.marketplace.snoozeAd(adId, until),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['ad'] });
      setOpen(false);
    },
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const now = Date.now();
  const isSnoozed = !!snoozedUntil && snoozedUntil > now;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-md px-2 py-1 text-xs ${
          isSnoozed
            ? 'bg-amber-950/40 text-warn hover:bg-amber-950/60'
            : 'bg-surface hover:bg-surface-hover'
        }`}
        title={
          isSnoozed
            ? `Snoozed until ${new Date(snoozedUntil!).toLocaleString()}`
            : 'Snooze (skip in scans/notifications)'
        }
      >
        {isSnoozed ? (
          <span className="inline-flex items-center gap-1">
            <BellOff size={11} />
            {!compact && <span>Snoozed</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {!compact && <span>Snooze</span>}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface shadow-xl">
          {PRESETS.map((p) => (
            <button
              key={p.hours}
              onClick={() => snoozeMut.mutate(Date.now() + p.hours * 3600_000)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-surface-hover"
            >
              <span>{p.label}</span>
              <Check size={11} className="opacity-0" />
            </button>
          ))}
          {isSnoozed && (
            <>
              <div className="border-t border-border" />
              <button
                onClick={() => snoozeMut.mutate(null)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-accent hover:bg-surface-hover"
              >
                <BellRing size={11} /> Unsnooze
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
