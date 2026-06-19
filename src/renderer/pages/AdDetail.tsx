import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, RotateCw, Trash2, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { RenewButton } from '../components/RenewButton';
import { SnoozeMenu } from '../components/SnoozeMenu';
import { PLATFORM_DISPLAY_NAMES, type PlatformId } from '@shared/types/platform';
import type { Ad, RepostHistoryEntry } from '@shared/types/ad';
import { PhotoTile } from '../components/PhotoTile';
import { PlatformBadge } from '../components/PlatformBadge';
import { AgeBadge } from '../components/AgeBadge';
import { usePhoto } from '../hooks/usePhoto';
import { PhotoLightbox } from '../components/PhotoLightbox';
import { toast } from '../store/toastStore';

export default function AdDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const adQ = useQuery({
    queryKey: ['ad', id],
    queryFn: () => window.marketplace.getAd(id),
    enabled: !!id,
  });

  // Siblings: all ads with the same logical_ad_id (we re-list with no filter and group client-side).
  const allQ = useQuery({
    queryKey: ['ads', {}],
    queryFn: () => window.marketplace.listAds({ status: ['active', 'expired', 'deleted', 'pending'] }),
  });

  const ad = adQ.data;
  const view = allQ.data?.find((x) => x.id === id);
  const siblings = ad && allQ.data ? allQ.data.filter((x) => x.logicalAdId === ad.logicalAdId && x.id !== ad.id) : [];

  const historyQ = useQuery({
    queryKey: ['history', ad?.logicalAdId],
    queryFn: () => (ad ? window.marketplace.getHistory(ad.logicalAdId) : Promise.resolve([])),
    enabled: !!ad,
  });

  const repostMut = useMutation({
    mutationFn: () => window.marketplace.repost(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['history', ad?.logicalAdId] });
      qc.invalidateQueries({ queryKey: ['activity'] });
      if (r.ok) toast.success('Reposted');
      else toast.error(r.message ?? 'Repost failed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });
  const rescanMut = useMutation({
    mutationFn: () => window.marketplace.rescanAd(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['ad', id] });
      qc.invalidateQueries({ queryKey: ['history', ad?.logicalAdId] });
      qc.invalidateQueries({ queryKey: ['activity'] });
      if (r.ok) toast.success('Refreshed from platform');
      else toast.error(r.message ?? 'Rescan failed');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });
  const deleteMut = useMutation({
    mutationFn: () => window.marketplace.deleteAd(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      if (r.ok) {
        toast.success('Deleted');
        navigate('/');
      } else {
        toast.error(r.message ?? 'Delete failed');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  if (adQ.isLoading) return <Centered>Loading…</Centered>;
  if (!ad) return <Centered>Ad not found.</Centered>;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-md p-1.5 text-muted hover:bg-surface-hover">
            <ArrowLeft size={16} />
          </button>
          <PlatformBadge platform={ad.platform} />
          {view && <AgeBadge days={view.ageDays} />}
          <span className="text-xs text-muted">
            {ad.status} · posted {new Date(ad.postedAt).toLocaleString()}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <SnoozeMenu adId={ad.id} snoozedUntil={ad.snoozedUntil} />
            <button
              onClick={() => rescanMut.mutate()}
              disabled={rescanMut.isPending}
              title="Re-scrape this ad from the platform"
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover disabled:opacity-50"
            >
              {rescanMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Rescan
            </button>
            <RenewButton adId={id} size="md" />
            <button
              onClick={() => repostMut.mutate()}
              disabled={repostMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover disabled:opacity-50"
            >
              {repostMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
              Repost
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete this ${PLATFORM_DISPLAY_NAMES[ad.platform]} ad?`)) deleteMut.mutate();
              }}
              disabled={deleteMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-900 px-3 py-1.5 text-sm text-danger hover:bg-red-950/40 disabled:opacity-50"
            >
              <Trash2 size={12} />
              Delete
            </button>
            {ad.url && (
              <a
                href={ad.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
              >
                <ExternalLink size={12} />
                Open
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">{ad.title}</h1>
              <div className="mt-1 text-lg text-fg">{ad.priceCents != null ? `$${(ad.priceCents / 100).toFixed(0)} ${ad.currency}` : 'Free / contact'}</div>
              {ad.category && <div className="mt-0.5 text-xs text-muted">{ad.category}</div>}
            </div>

            <PhotoGallery adId={ad.id} />

            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">Description</h2>
              <div className="whitespace-pre-wrap rounded-md border border-border bg-surface p-4 text-sm text-zinc-200">
                {ad.description || <span className="text-muted">(no description)</span>}
              </div>
            </section>

            <NotesSection ad={ad} />


            {siblings.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">Also live on</h2>
                <div className="space-y-1.5">
                  {siblings.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/ad/${s.id}`)}
                      className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-surface-hover"
                    >
                      <PlatformBadge platform={s.platform} />
                      <span className="flex-1 truncate">{s.title}</span>
                      <AgeBadge days={s.ageDays} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="col-span-1">
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">History</h2>
            <HistoryTimeline ad={ad} entries={historyQ.data ?? []} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center text-muted">{children}</div>;
}

function NotesSection({ ad }: { ad: Ad }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string>(ad.notes ?? '');
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const saveMut = useMutation({
    mutationFn: (value: string) => window.marketplace.setNotes(ad.id, value.trim() === '' ? null : value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad', ad.id] });
      setDirty(false);
      setSavedAt(Date.now());
    },
  });

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wide text-muted">Your notes</h2>
        <span className="text-[11px] text-muted">
          {dirty
            ? 'Unsaved'
            : savedAt
              ? `Saved ${new Date(savedAt).toLocaleTimeString()}`
              : ad.notes
                ? 'Saved'
                : ''}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(e.target.value !== (ad.notes ?? ''));
        }}
        onBlur={() => {
          if (dirty) saveMut.mutate(draft);
        }}
        placeholder="Private notes — visible only in this app, never pushed to platforms."
        rows={3}
        className="w-full rounded-md border border-border bg-surface p-3 text-sm text-zinc-200 focus:border-accent focus:outline-none"
      />
    </section>
  );
}

function PhotoGallery({ adId }: { adId: string }) {
  const photosQ = useQuery({
    queryKey: ['ad-photos', adId],
    queryFn: () => window.marketplace.getPhotos(adId),
  });
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const photos = photosQ.data ?? [];
  if (photosQ.isLoading) return null;

  const hashes = photos.map((p) => p.hash);

  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">Photos ({photos.length})</h2>
      {photos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface/40 p-6 text-center text-xs text-muted">
          <div>No photos stored locally.</div>
          <div className="mt-1 text-[11px]">
            Photos are downloaded the first time an ad is scanned. Existing ads scanned before this build may not have them.
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setLightboxIdx(0)}
            className="block rounded-md hover:opacity-90"
          >
            <PrimaryPhoto hash={photos[0]!.hash} />
          </button>
          {photos.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.slice(1).map((p, i) => (
                <button
                  key={p.hash}
                  type="button"
                  onClick={() => setLightboxIdx(i + 1)}
                  className="rounded-md hover:opacity-80"
                >
                  <PhotoTile hash={p.hash} size={72} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {lightboxIdx !== null && (
        <PhotoLightbox hashes={hashes} initialIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </section>
  );
}

function PrimaryPhoto({ hash }: { hash: string | null }) {
  const { data } = usePhoto(hash);
  if (!hash || !data) return <PhotoTile hash={hash} size={200} />;
  return <img src={data} alt="" className="max-h-96 rounded-md object-contain" />;
}

function HistoryTimeline({ ad, entries }: { ad: Ad; entries: RepostHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 text-xs text-muted">No history yet.</div>
    );
  }
  return (
    <ol className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="rounded-md border border-border bg-surface p-3">
          <div className="flex items-center gap-2 text-xs">
            {e.success ? (
              <CheckCircle2 size={12} className="text-success" />
            ) : (
              <XCircle size={12} className="text-danger" />
            )}
            <span className="font-medium capitalize">{e.action}</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{PLATFORM_DISPLAY_NAMES[e.platform as PlatformId] ?? e.platform}</span>
            <span className="ml-auto text-muted">{new Date(e.timestamp).toLocaleString()}</span>
          </div>
          {e.errorMessage && <div className="mt-1 text-xs text-danger">{e.errorMessage}</div>}
          {e.beforeAdId && e.afterAdId && e.beforeAdId !== e.afterAdId && (
            <div className="mt-1 text-[11px] text-muted">
              <code>{e.beforeAdId}</code> → <code>{e.afterAdId}</code>
            </div>
          )}
        </li>
      ))}
      <li className="rounded-md border border-border bg-surface/40 p-3 text-xs text-muted">
        Created locally {new Date(ad.createdAt).toLocaleString()}
      </li>
    </ol>
  );
}
