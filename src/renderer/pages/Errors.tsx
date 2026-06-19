import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { XCircle, FolderOpen, Loader2 } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';

export default function Errors() {
  const navigate = useNavigate();
  const failuresQ = useQuery({
    queryKey: ['recent-failures'],
    queryFn: () => window.marketplace.getRecentFailures(50),
    refetchInterval: 30_000,
  });

  const failures = failuresQ.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <h1 className="text-base font-semibold">Recent errors</h1>
        <button
          onClick={() => void window.marketplace.openUserDataFolder()}
          className="inline-flex items-center gap-1.5 rounded-md bg-bg px-3 py-1.5 text-sm hover:bg-surface-hover"
        >
          <FolderOpen size={14} /> Open logs folder
        </button>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        {failuresQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
          </div>
        ) : failures.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-10 text-center text-muted">
            <div className="text-sm">No errors recorded.</div>
            <div className="mt-1 text-xs">Failed actions and broken-selector reports will show up here.</div>
          </div>
        ) : (
          <ul className="space-y-2">
            {failures.map((f) => (
              <li key={f.id} className="rounded-lg border border-red-900/60 bg-red-950/20 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <XCircle size={14} className="text-danger" />
                  <span className="font-medium capitalize">{f.action}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">{PLATFORM_DISPLAY_NAMES[f.platform as PlatformId] ?? f.platform}</span>
                  <span className="ml-auto text-muted">{new Date(f.timestamp).toLocaleString()}</span>
                </div>
                {f.errorMessage && (
                  <div className="mt-2 whitespace-pre-wrap rounded-md bg-bg p-2 font-mono text-[11px] text-zinc-300">
                    {f.errorMessage}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                  {f.beforeAdId && <span>before: <code>{f.beforeAdId}</code></span>}
                  {f.afterAdId && <span>after: <code>{f.afterAdId}</code></span>}
                  <button
                    onClick={() => navigate(`/ad/${f.logicalAdId}`)}
                    className="ml-auto text-accent hover:underline"
                  >
                    View ad history →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
