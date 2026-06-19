import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Pause } from 'lucide-react';

function formatCountdown(target: number, now: number): string {
  const diff = Math.max(0, target - now);
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  if (h > 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

export function NextScanIndicator() {
  const infoQ = useQuery({
    queryKey: ['schedule-info'],
    queryFn: () => window.marketplace.scheduleInfo(),
    refetchInterval: 60_000,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  void tick;

  if (!infoQ.data) return null;
  const { scansPaused, nextRunAt } = infoQ.data;

  if (scansPaused) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-900 bg-amber-950/40 px-2 py-1 text-[11px] text-warn">
        <Pause size={11} /> Scheduled scans paused
      </span>
    );
  }
  if (!nextRunAt) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted"
      title={`Next scan: ${new Date(nextRunAt).toLocaleString()}`}
    >
      <Clock size={11} /> Next scan in {formatCountdown(nextRunAt, Date.now())}
    </span>
  );
}
