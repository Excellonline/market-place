import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformHealth, type PlatformId } from '@shared/types/platform';

/**
 * Inline banner that surfaces broken / rate-limited / paused platforms.
 * Saves the user from clicking the health chip just to see what went wrong.
 */
export function ScanErrorBanner() {
  const healthQ = useQuery({
    queryKey: ['health'],
    queryFn: () => window.marketplace.platformHealth(),
    refetchInterval: 30_000,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const bad = (healthQ.data ?? []).filter((h) =>
    h.status === 'broken' || h.status === 'paused' || h.status === 'rate_limited' || (h.lastScanAt && !h.lastScanSucceeded),
  );
  if (bad.length === 0) return null;

  return (
    <div className="border-b border-red-900/50 bg-red-950/20 px-5 py-2">
      <div className="space-y-1.5">
        {bad.map((h) => (
          <BannerRow
            key={h.platform}
            h={h}
            expanded={!!expanded[h.platform]}
            onToggle={() => setExpanded((p) => ({ ...p, [h.platform]: !p[h.platform] }))}
          />
        ))}
      </div>
    </div>
  );
}

function BannerRow({ h, expanded, onToggle }: { h: PlatformHealth; expanded: boolean; onToggle: () => void }) {
  const verb =
    h.status === 'paused' ? 'paused (needs attention)' :
    h.status === 'broken' ? 'has a broken selector' :
    h.status === 'rate_limited' ? 'is rate-limited' :
    'last scan failed';
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-2 text-left text-xs">
        {expanded ? <ChevronDown size={11} className="text-danger" /> : <ChevronRight size={11} className="text-danger" />}
        <AlertTriangle size={12} className="text-danger" />
        <span className="font-medium text-danger">{PLATFORM_DISPLAY_NAMES[h.platform as PlatformId] ?? h.platform}</span>
        <span className="text-zinc-300">{verb}</span>
        {h.lastErrorMessage && (
          <span className="ml-2 truncate text-zinc-400" title={h.lastErrorMessage}>
            — {h.lastErrorMessage}
          </span>
        )}
      </button>
      {expanded && h.lastErrorMessage && (
        <div className="ml-5 mt-1 rounded-md border border-red-900/60 bg-red-950/30 p-2 text-[11px]">
          <pre className="whitespace-pre-wrap text-zinc-200">{h.lastErrorMessage}</pre>
          {h.lastErrorScreenshot && (
            <button
              onClick={() => void window.marketplace.revealPath(h.lastErrorScreenshot!)}
              className="mt-1 inline-flex items-center gap-1 text-muted hover:text-fg"
            >
              <FolderOpen size={10} /> Reveal screenshot ({h.lastErrorScreenshot.split(/[/\\]/).pop()})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
