import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ListPlus, Edit3, Loader2, Send, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';
import type { AdDraft } from '@shared/types/ad';
import { PhotoTile } from '../components/PhotoTile';

export default function Drafts() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const draftsQ = useQuery({ queryKey: ['drafts'], queryFn: () => window.marketplace.listDrafts() });
  const [publishResult, setPublishResult] = useState<{ title: string; results: Record<string, { ok: boolean; platformAdId?: string; message?: string }> } | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => window.marketplace.deleteDraft(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drafts'] }),
  });

  const publishMut = useMutation({
    mutationFn: async (draft: AdDraft) => {
      const platforms = (Object.keys(draft.perPlatform) as PlatformId[]).filter(
        (p) => draft.perPlatform[p]?.enabled,
      );
      const r = await window.marketplace.publishDraft(draft.id, platforms);
      return { title: draft.title || '(untitled)', results: r.perPlatform };
    },
    onSuccess: (r) => {
      setPublishResult(r);
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['drafts'] });
    },
  });

  const drafts = draftsQ.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <h1 className="text-base font-semibold">Drafts</h1>
        <button
          onClick={() => navigate('/compose')}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
        >
          <Plus size={14} /> New draft
        </button>
      </header>

      <div className="flex-1 overflow-auto px-5 py-4">
        {draftsQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/40 p-10 text-center text-muted">
            <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover">
              <ListPlus size={18} />
            </div>
            <div className="text-sm">No drafts yet.</div>
            <div className="mt-1 text-xs">Compose an ad once, save it as a draft, and you can republish it any time.</div>
          </div>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => {
              const enabledPlatforms = (Object.keys(d.perPlatform) as PlatformId[]).filter(
                (p) => d.perPlatform[p]?.enabled,
              );
              return (
                <li
                  key={d.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3 hover:bg-surface-hover"
                >
                  <PhotoTile hash={d.photoHashes[0] ?? null} size={56} />
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/compose/${d.id}`)}
                      className="text-left font-medium hover:text-accent block w-full truncate"
                    >
                      {d.title || <span className="text-muted">(untitled)</span>}
                    </button>
                    <div className="mt-0.5 text-xs text-muted">
                      {d.priceCents != null ? `$${(d.priceCents / 100).toFixed(0)}` : 'Free / contact'}
                      {' · '}
                      Updated {new Date(d.updatedAt).toLocaleString()}
                      {' · '}
                      {d.photoHashes.length} photo{d.photoHashes.length === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enabledPlatforms.map((p) => (
                      <span
                        key={p}
                        className="rounded-md border border-border bg-bg px-1.5 py-0.5 text-[10px] text-muted"
                      >
                        {PLATFORM_DISPLAY_NAMES[p]}
                      </span>
                    ))}
                    {enabledPlatforms.length === 0 && (
                      <span className="rounded-md border border-amber-900 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-warn">
                        no platforms
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => publishMut.mutate(d)}
                      disabled={publishMut.isPending || enabledPlatforms.length === 0}
                      className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
                      title={enabledPlatforms.length === 0 ? 'No platforms enabled' : 'Publish now'}
                    >
                      {publishMut.isPending && publishMut.variables?.id === d.id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Send size={11} />
                      )}
                      Publish
                    </button>
                    <button
                      onClick={() => navigate(`/compose/${d.id}`)}
                      className="rounded-md bg-bg px-2 py-1 text-xs hover:bg-surface"
                      title="Edit"
                    >
                      <Edit3 size={11} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete draft "${d.title || 'untitled'}"?`)) deleteMut.mutate(d.id);
                      }}
                      className="rounded-md bg-bg px-2 py-1 text-xs text-danger hover:bg-red-950/40"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {publishResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPublishResult(null)}
        >
          <div
            className="w-[480px] rounded-lg border border-border bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Published "{publishResult.title}"</h3>
              <button onClick={() => setPublishResult(null)} className="rounded-md p-1 text-muted hover:bg-surface-hover">
                <X size={14} />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(publishResult.results).map(([platform, r]) => (
                <div
                  key={platform}
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
                    r.ok
                      ? 'border-emerald-900 bg-emerald-950/30 text-success'
                      : 'border-red-900 bg-red-950/30 text-danger'
                  }`}
                >
                  {r.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <div>
                    <div className="font-medium">{PLATFORM_DISPLAY_NAMES[platform as PlatformId] ?? platform}</div>
                    {r.ok ? (
                      <div className="text-muted">Published · id {r.platformAdId}</div>
                    ) : (
                      <div>{r.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setPublishResult(null)}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
