import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2, RefreshCw, RotateCw, Trash2, Plus, Eye, Filter, RotateCcw } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_IDS, type PlatformId } from '@shared/types/platform';
import type { RepostAction, RepostHistoryEntry } from '@shared/types/ad';
import { PlatformBadge } from '../components/PlatformBadge';
import { toast } from '../store/toastStore';

const ACTION_OPTIONS: Array<{ value: RepostAction; label: string; icon: React.ReactNode }> = [
  { value: 'scan', label: 'Scan', icon: <Eye size={11} /> },
  { value: 'renew', label: 'Renew', icon: <RefreshCw size={11} /> },
  { value: 'repost', label: 'Repost', icon: <RotateCw size={11} /> },
  { value: 'create', label: 'Create', icon: <Plus size={11} /> },
  { value: 'delete', label: 'Delete', icon: <Trash2 size={11} /> },
];

export default function Activity() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<PlatformId | null>(null);
  const [actions, setActions] = useState<RepostAction[]>([]);
  const [onlyFailures, setOnlyFailures] = useState(false);

  const q = useQuery({
    queryKey: ['activity', platform, actions, onlyFailures],
    queryFn: () =>
      window.marketplace.getRecentActivity({
        limit: 200,
        platform: platform ?? undefined,
        actions: actions.length > 0 ? actions : undefined,
        onlyFailures,
      }),
    refetchInterval: 30_000,
  });

  const entries = q.data ?? [];

  function toggleAction(a: RepostAction) {
    setActions((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold">Activity</h1>
          <span className="ml-2 text-xs text-muted">{entries.length} entries</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Filter size={12} className="text-muted" />
          <Pill label="All platforms" active={platform === null} onClick={() => setPlatform(null)} />
          {PLATFORM_IDS.map((p) => (
            <Pill
              key={p}
              label={PLATFORM_DISPLAY_NAMES[p]}
              active={platform === p}
              onClick={() => setPlatform(platform === p ? null : p)}
            />
          ))}
          <div className="h-4 w-px bg-border" />
          {ACTION_OPTIONS.map((a) => (
            <Pill
              key={a.value}
              icon={a.icon}
              label={a.label}
              active={actions.includes(a.value)}
              onClick={() => toggleAction(a.value)}
            />
          ))}
          <div className="h-4 w-px bg-border" />
          <Pill
            label="Failures only"
            active={onlyFailures}
            onClick={() => setOnlyFailures(!onlyFailures)}
            danger
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-10 text-center text-muted">
            <div className="text-sm">No activity matches these filters.</div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} onClick={() => navigate(`/ad/${e.logicalAdId}`)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Pill({
  label,
  icon,
  active,
  onClick,
  danger,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  const activeClass = danger
    ? 'border-red-900 bg-red-950/30 text-danger'
    : 'border-accent bg-accent/15 text-fg';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
        active ? activeClass : 'border-border bg-transparent text-muted hover:text-fg'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EntryRow({ entry, onClick }: { entry: RepostHistoryEntry; onClick: () => void }) {
  const actionConfig = ACTION_OPTIONS.find((a) => a.value === entry.action);
  const qc = useQueryClient();
  const retryMut = useMutation({
    mutationFn: () =>
      window.marketplace.retryAction({ action: entry.action, logicalAdId: entry.logicalAdId }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['activity'] });
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['recent-failures'] });
      if (r.ok) toast.success(`Retried ${entry.action}`);
      else toast.error(r.message ?? `Retry failed`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });
  const canRetry = !entry.success && entry.action !== 'create';
  return (
    <li className="rounded-md border border-border bg-surface hover:bg-surface-hover">
      <div className="flex items-start gap-2 px-3 py-2">
        <button onClick={onClick} className="flex-1 text-left">
          <div className="flex items-center gap-2 text-xs">
            {entry.success ? (
              <CheckCircle2 size={12} className="text-success" />
            ) : (
              <XCircle size={12} className="text-danger" />
            )}
            <span className="inline-flex items-center gap-1 font-medium capitalize">
              {actionConfig?.icon}
              {entry.action}
            </span>
            <PlatformBadge platform={entry.platform} />
            {entry.beforeAdId && entry.afterAdId && entry.beforeAdId !== entry.afterAdId && (
              <span className="text-[10px] text-muted">
                <code>{entry.beforeAdId.slice(0, 8)}…</code> → <code>{entry.afterAdId.slice(0, 8)}…</code>
              </span>
            )}
            <span className="ml-auto text-muted">{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          {entry.errorMessage && (
            <div className="mt-1 truncate text-[11px] text-danger" title={entry.errorMessage}>
              {entry.errorMessage}
            </div>
          )}
        </button>
        {canRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              retryMut.mutate();
            }}
            disabled={retryMut.isPending}
            title="Retry this action"
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-bg px-2 py-1 text-[11px] hover:bg-surface disabled:opacity-50"
          >
            {retryMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
            Retry
          </button>
        )}
      </div>
    </li>
  );
}
