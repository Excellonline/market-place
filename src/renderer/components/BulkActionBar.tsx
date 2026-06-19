import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, RotateCw, Trash2, X, Loader2, CheckCircle2, XCircle, BellOff, BellRing } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';
import type { AdView, BulkAction } from '@shared/types/ad';
import { useUiStore } from '../store/uiStore';
import { useEscape } from '../hooks/useEscape';

interface ItemResult {
  id: string;
  ok: boolean | null;        // null = pending
  message?: string;
  ad: AdView;
}

interface Props {
  ads: AdView[];
}

export function BulkActionBar({ ads }: Props) {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const clear = useUiStore((s) => s.clearSelection);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);
  const [progress, setProgress] = useState<ItemResult[] | null>(null);
  const qc = useQueryClient();

  const selectedAds = ads.filter((a) => selectedIds.has(a.id));
  const count = selectedAds.length;

  const byPlatform = selectedAds.reduce<Record<PlatformId, number>>(
    (acc, a) => {
      acc[a.platform] = (acc[a.platform] ?? 0) + 1;
      return acc;
    },
    {} as Record<PlatformId, number>,
  );

  const runMut = useMutation({
    mutationFn: async (action: BulkAction) => {
      const initial: ItemResult[] = selectedAds.map((ad) => ({ id: ad.id, ok: null, ad }));
      setProgress(initial);

      const results: Array<{ id: string; ok: boolean; message?: string }> = [];
      for (const ad of selectedAds) {
        let r: { ok: boolean; message?: string };
        switch (action) {
          case 'renew':
            r = await window.marketplace.renew(ad.id);
            break;
          case 'delete':
            r = await window.marketplace.deleteAd(ad.id);
            break;
          case 'repost':
            r = await window.marketplace.repost(ad.id);
            break;
          case 'snooze_1d':
            r = await window.marketplace.snoozeAd(ad.id, Date.now() + 86400_000);
            break;
          case 'snooze_7d':
            r = await window.marketplace.snoozeAd(ad.id, Date.now() + 7 * 86400_000);
            break;
          case 'unsnooze':
            r = await window.marketplace.snoozeAd(ad.id, null);
            break;
        }
        results.push({ id: ad.id, ...r });
        setProgress((prev) =>
          prev ? prev.map((p) => (p.id === ad.id ? { ...p, ok: r.ok, message: r.message } : p)) : prev,
        );
      }
      return results;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['health'] });
      qc.invalidateQueries({ queryKey: ['recent-failures'] });
    },
  });

  function closeAll() {
    setPendingAction(null);
    setProgress(null);
    clear();
  }

  if (count === 0 && !progress) return null;

  return (
    <>
      {count > 0 && !progress && (
        <div className="sticky bottom-4 left-0 right-0 mx-auto flex w-fit items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 shadow-xl">
          <span className="text-sm font-medium">{count} selected</span>
          <span className="text-xs text-muted">
            {(Object.keys(byPlatform) as PlatformId[])
              .map((p) => `${byPlatform[p]} ${PLATFORM_DISPLAY_NAMES[p]}`)
              .join(' · ')}
          </span>
          <div className="ml-2 h-4 w-px bg-border" />
          <button
            onClick={() => setPendingAction('renew')}
            className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2.5 py-1 text-xs hover:bg-surface-hover"
          >
            <RefreshCw size={12} /> Renew
          </button>
          <button
            onClick={() => setPendingAction('repost')}
            className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2.5 py-1 text-xs hover:bg-surface-hover"
          >
            <RotateCw size={12} /> Repost
          </button>
          <SnoozeDropdown onPick={(a) => setPendingAction(a)} />
          <button
            onClick={() => setPendingAction('delete')}
            className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2.5 py-1 text-xs text-danger hover:bg-red-950/40"
          >
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={clear} className="rounded-md p-1 text-muted hover:bg-surface-hover" aria-label="Clear selection">
            <X size={14} />
          </button>
        </div>
      )}

      {pendingAction && !progress && (
        <ConfirmDialog
          action={pendingAction}
          count={count}
          byPlatform={byPlatform}
          isPending={runMut.isPending}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => runMut.mutate(pendingAction)}
        />
      )}

      {progress && (
        <ProgressDialog
          action={pendingAction!}
          items={progress}
          isPending={runMut.isPending}
          onClose={closeAll}
        />
      )}
    </>
  );
}

function SnoozeDropdown({ onPick }: { onPick: (a: BulkAction) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md bg-bg px-2.5 py-1 text-xs hover:bg-surface-hover"
      >
        <BellOff size={12} /> Snooze
      </button>
      {open && (
        <div
          className="absolute bottom-full left-0 mb-1 w-36 overflow-hidden rounded-md border border-border bg-surface shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <button onClick={() => { onPick('snooze_1d'); setOpen(false); }} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover">
            1 day
          </button>
          <button onClick={() => { onPick('snooze_7d'); setOpen(false); }} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover">
            1 week
          </button>
          <div className="border-t border-border" />
          <button onClick={() => { onPick('unsnooze'); setOpen(false); }} className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-xs text-accent hover:bg-surface-hover">
            <BellRing size={11} /> Unsnooze
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmDialog({
  action,
  count,
  byPlatform,
  isPending,
  onCancel,
  onConfirm,
}: {
  action: BulkAction;
  count: number;
  byPlatform: Record<PlatformId, number>;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const verb =
    action === 'renew' ? 'Renew' :
    action === 'repost' ? 'Repost' :
    action === 'delete' ? 'Delete' :
    action === 'snooze_1d' ? 'Snooze for 1 day' :
    action === 'snooze_7d' ? 'Snooze for 1 week' :
    'Unsnooze';
  const danger = action === 'delete';
  useEscape(!isPending, onCancel);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-confirm-title"
    >
      <div className="w-[420px] rounded-lg border border-border bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 id="bulk-confirm-title" className="text-base font-semibold">{verb} {count} ad{count === 1 ? '' : 's'}?</h3>
        <p className="mt-2 text-xs text-muted">
          The tool will run actions sequentially with human-like delays. You'll see live progress.
        </p>
        <ul className="mt-3 space-y-1 text-xs">
          {(Object.keys(byPlatform) as PlatformId[]).map((p) => (
            <li key={p} className="flex items-center justify-between rounded-md bg-bg px-2 py-1">
              <span className="text-fg">{PLATFORM_DISPLAY_NAMES[p]}</span>
              <span className="text-muted">{byPlatform[p]} ad{byPlatform[p] === 1 ? '' : 's'}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md bg-bg px-3 py-1.5 text-sm hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
              danger ? 'bg-danger hover:bg-red-600' : 'bg-accent hover:bg-indigo-600'
            }`}
          >
            {verb}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressDialog({
  action,
  items,
  isPending,
  onClose,
}: {
  action: BulkAction;
  items: ItemResult[];
  isPending: boolean;
  onClose: () => void;
}) {
  const done = items.filter((i) => i.ok !== null).length;
  const ok = items.filter((i) => i.ok === true).length;
  const failed = items.filter((i) => i.ok === false).length;
  const verb = action === 'renew' ? 'Renewing' : action === 'repost' ? 'Reposting' : 'Deleting';
  useEscape(!isPending, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-progress-title"
    >
      <div className="w-[520px] max-h-[80vh] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            {isPending ? (
              <Loader2 size={16} className="animate-spin text-accent" />
            ) : (
              <CheckCircle2 size={16} className="text-success" />
            )}
            <h3 id="bulk-progress-title" className="text-base font-semibold">{isPending ? verb : 'Done'}</h3>
            <span className="ml-auto text-xs text-muted">
              {done}/{items.length} · {ok} ok · {failed} failed
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${items.length > 0 ? (done / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <ul className="flex-1 overflow-auto p-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-md border border-border bg-bg p-2 text-xs">
              <StatusIcon ok={i.ok} />
              <span className="flex-1 truncate font-medium">{i.ad.title}</span>
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                {PLATFORM_DISPLAY_NAMES[i.ad.platform]}
              </span>
              {i.ok === false && i.message && (
                <span className="ml-2 text-danger truncate max-w-[180px]" title={i.message}>
                  {i.message}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-border p-3 flex justify-end">
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {isPending ? 'Running…' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Loader2 size={12} className="animate-spin text-muted" />;
  if (ok) return <CheckCircle2 size={12} className="text-success" />;
  return <XCircle size={12} className="text-danger" />;
}
