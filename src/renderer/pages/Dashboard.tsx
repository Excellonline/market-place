import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAds, usePlatformHealth } from '../hooks/useAds';
import { useUiStore } from '../store/uiStore';
import { PLATFORM_DISPLAY_NAMES, type PlatformHealth, type PlatformId } from '@shared/types/platform';
import type { AdView } from '@shared/types/ad';
import { Wifi, RefreshCw, Loader2, RotateCw, ExternalLink } from 'lucide-react';
import { AgeBadge } from '../components/AgeBadge';
import { PlatformBadge } from '../components/PlatformBadge';
import { PhotoTile } from '../components/PhotoTile';
import { BulkActionBar } from '../components/BulkActionBar';
import { ScanProgressBar } from '../components/ScanProgressBar';
import { PlatformHealthChip } from '../components/PlatformHealthChip';
import { AgeRangeFilter } from '../components/AgeRangeFilter';
import { RenewButton } from '../components/RenewButton';
import { StatsStrip } from '../components/StatsStrip';
import { SnoozeMenu } from '../components/SnoozeMenu';
import { NextScanIndicator } from '../components/NextScanIndicator';
import { toast } from '../store/toastStore';
import { useFilterUrlSync } from '../hooks/useFilterUrlSync';
import { useScanProgress } from '../hooks/useScanProgress';
import { ScanErrorBanner } from '../components/ScanErrorBanner';

export default function Dashboard() {
  useFilterUrlSync(true);
  const platformFilter = useUiStore((s) => s.platformFilter);
  const statusFilter = useUiStore((s) => s.statusFilter);
  const minAgeDays = useUiStore((s) => s.minAgeDays);
  const maxAgeDays = useUiStore((s) => s.maxAgeDays);
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const setPlatformFilter = useUiStore((s) => s.setPlatformFilter);
  const selectedIds = useUiStore((s) => s.selectedIds);
  const toggleSelection = useUiStore((s) => s.toggleSelection);
  const selectAll = useUiStore((s) => s.selectAll);
  const clearSelection = useUiStore((s) => s.clearSelection);

  const filter = useMemo(
    () => ({
      platforms: platformFilter.length > 0 ? platformFilter : undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      minAgeDays: minAgeDays ?? undefined,
      maxAgeDays: maxAgeDays ?? undefined,
      search: search || undefined,
    }),
    [platformFilter, statusFilter, minAgeDays, maxAgeDays, search],
  );

  const adsQ = useAds(filter);
  const healthQ = usePlatformHealth();
  const scanProgress = useScanProgress();
  const anyScanActive = Object.values(scanProgress).some((s) => s.active);
  const ads = adsQ.data ?? [];

  const allSelected = ads.length > 0 && ads.every((a) => selectedIds.has(a.id));

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          {(['facebook', 'kijiji'] as PlatformId[]).map((p) => {
            const h = healthQ.data?.find((x: PlatformHealth) => x.platform === p);
            return <PlatformHealthChip key={p} platform={p} h={h} />;
          })}
          <NextScanIndicator />
          <div className="ml-auto flex items-center gap-2">
            <input
              type="search"
              placeholder="Search title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => {
                void window.marketplace.scanAll();
                toast.info('Scanning…');
              }}
              disabled={anyScanActive}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={anyScanActive ? 'animate-spin' : ''} />
              {anyScanActive ? 'Scanning…' : 'Scan now'}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <PlatformPill label="All" active={platformFilter.length === 0} onClick={() => setPlatformFilter([])} />
            {(['facebook', 'kijiji'] as PlatformId[]).map((p) => (
              <PlatformPill
                key={p}
                label={PLATFORM_DISPLAY_NAMES[p]}
                active={platformFilter.includes(p)}
                onClick={() =>
                  setPlatformFilter(
                    platformFilter.includes(p) ? platformFilter.filter((x) => x !== p) : [...platformFilter, p],
                  )
                }
              />
            ))}
          </div>
          <AgeRangeFilter />
        </div>
      </header>

      <ScanProgressBar />
      <ScanErrorBanner />
      <StatsStrip />

      <div className="flex-1 overflow-auto px-5 py-4">
        {adsQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 size={18} className="mr-2 animate-spin" /> Loading ads…
          </div>
        ) : ads.length === 0 ? (
          <EmptyState />
        ) : (
          <AdTable
            ads={ads}
            selectedIds={selectedIds}
            allSelected={allSelected}
            onToggle={toggleSelection}
            onToggleAll={() => (allSelected ? clearSelection() : selectAll(ads.map((a) => a.id)))}
          />
        )}
      </div>

      <BulkActionBar ads={ads} />
    </div>
  );
}

function PlatformPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs ${
        active ? 'border-accent bg-accent/15 text-fg' : 'border-border bg-transparent text-muted hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-surface/40 p-10 text-center text-muted">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover">
        <Wifi size={18} />
      </div>
      <div className="text-sm text-fg">No ads scanned yet</div>
      <ol className="mt-3 space-y-1.5 text-left text-xs leading-relaxed">
        <li>
          <span className="text-fg">1.</span> Open Settings <kbd className="ml-1 rounded border border-border bg-bg px-1 py-0.5 font-mono text-[10px]">g s</kbd>
        </li>
        <li>
          <span className="text-fg">2.</span> Click <span className="text-fg">Log in</span> on each platform you use
        </li>
        <li>
          <span className="text-fg">3.</span> Come back here and hit <span className="text-fg">Scan now</span>{' '}
          <kbd className="ml-1 rounded border border-border bg-bg px-1 py-0.5 font-mono text-[10px]">r</kbd>
        </li>
      </ol>
      <p className="mt-4 text-[11px]">
        Press <kbd className="rounded border border-border bg-bg px-1 py-0.5 font-mono text-[10px]">?</kbd> any time for shortcuts.
      </p>
    </div>
  );
}

function AdTable({
  ads,
  selectedIds,
  allSelected,
  onToggle,
  onToggleAll,
}: {
  ads: AdView[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface">
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-3.5 w-3.5 accent-indigo-500"
              />
            </th>
            <th className="px-3 py-2"></th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Platform</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Age</th>
            <th className="px-3 py-2">Views</th>
            <th className="px-3 py-2">Last action</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ads.map((a) => (
            <Row key={a.id} ad={a} selected={selectedIds.has(a.id)} onToggle={() => onToggle(a.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ ad, selected, onToggle }: { ad: AdView; selected: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const repostMut = useMutation({
    mutationFn: () => window.marketplace.repost(ad.id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
      if (r.ok) {
        toast.success(`Reposted "${ad.title}"`);
      } else {
        toast.error(r.message ?? 'Repost failed');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });
  const isSnoozed = !!ad.snoozedUntil && ad.snoozedUntil > Date.now();
  return (
    <tr
      className={`hover:bg-surface-hover/40 ${selected ? 'bg-accent/5' : ''} ${
        isSnoozed ? 'opacity-60' : ''
      }`}
    >
      <td className="px-3 py-2">
        <input type="checkbox" checked={selected} onChange={onToggle} className="h-3.5 w-3.5 accent-indigo-500" />
      </td>
      <td className="px-3 py-2">
        <PhotoTile hash={ad.thumbHash} size={40} />
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => navigate(`/ad/${ad.id}`)}
          className="text-left font-medium hover:text-accent"
        >
          {ad.title}
        </button>
        {ad.siblingPlatforms.length > 0 && (
          <span className="ml-1.5 rounded-md bg-surface-hover px-1 py-0.5 text-[10px] text-muted">
            +{ad.siblingPlatforms.length}
          </span>
        )}
      </td>
      <td className="px-3 py-2"><PlatformBadge platform={ad.platform} /></td>
      <td className="px-3 py-2">{ad.priceCents != null ? `$${(ad.priceCents / 100).toFixed(0)}` : '—'}</td>
      <td className="px-3 py-2"><AgeBadge days={ad.ageDays} /></td>
      <td className="px-3 py-2 text-muted">{ad.views ?? '—'}</td>
      <td className="px-3 py-2 text-xs text-muted">{ad.lastActionLabel ?? '—'}</td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1.5">
          <SnoozeMenu adId={ad.id} snoozedUntil={ad.snoozedUntil} compact />
          <RenewButton adId={ad.id} size="sm" />
          <button
            onClick={() => repostMut.mutate()}
            disabled={repostMut.isPending}
            className="rounded-md bg-surface px-2 py-1 text-xs hover:bg-surface-hover disabled:opacity-50"
          >
            {repostMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <><RotateCw size={11} className="inline" /> Repost</>}
          </button>
          {ad.url && (
            <a
              href={ad.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-surface px-2 py-1 text-xs hover:bg-surface-hover"
              title="Open on platform"
            >
              <ExternalLink size={11} className="inline" />
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}
