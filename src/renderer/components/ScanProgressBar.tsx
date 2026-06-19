import { Loader2 } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';
import { useScanProgress } from '../hooks/useScanProgress';

const stepLabels: Record<string, string> = {
  login_check: 'Checking session',
  list: 'Listing ads',
  enrich: 'Reading details',
  done: 'Done',
  idle: '',
};

export function ScanProgressBar() {
  const progress = useScanProgress();
  const platforms = (Object.keys(progress) as PlatformId[]).filter((p) => progress[p].active);
  if (platforms.length === 0) return null;

  return (
    <div className="border-b border-border bg-bg/80 backdrop-blur px-5 py-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        {platforms.map((p) => {
          const s = progress[p];
          const pct = s.total > 0 ? Math.round((s.current / s.total) * 100) : null;
          return (
            <div key={p} className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-accent" />
              <span className="font-medium">{PLATFORM_DISPLAY_NAMES[p]}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{stepLabels[s.step] ?? s.step}</span>
              {s.total > 0 && (
                <span className="text-muted">
                  {s.current}/{s.total}
                  {pct !== null && ` (${pct}%)`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
