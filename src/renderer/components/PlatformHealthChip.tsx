import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Loader2, RefreshCw, ShieldCheck, Wifi, WifiOff, X, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { PLATFORM_DISPLAY_NAMES, type PlatformHealth, type PlatformId } from '@shared/types/platform';

const styles: Record<string, string> = {
  healthy: 'text-success bg-emerald-950/40 border-emerald-900',
  logged_out: 'text-muted bg-zinc-800 border-zinc-700',
  unknown: 'text-muted bg-zinc-800 border-zinc-700',
  broken: 'text-danger bg-red-950/40 border-red-900',
  paused: 'text-danger bg-red-950/40 border-red-900',
  rate_limited: 'text-warn bg-amber-950/40 border-amber-900',
};

export function PlatformHealthChip({ platform, h }: { platform: PlatformId; h: PlatformHealth | undefined }) {
  const [open, setOpen] = useState(false);
  const status = h?.status ?? 'unknown';
  const color = styles[status] ?? styles.unknown!;
  const Icon =
    !h || !h.loggedIn ? WifiOff : status === 'healthy' ? ShieldCheck : status === 'rate_limited' ? AlertTriangle : Wifi;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:opacity-90 ${color}`}
      >
        <Icon size={12} />
        <span>{PLATFORM_DISPLAY_NAMES[platform]}</span>
        <span className="text-muted">·</span>
        <span>{!h ? 'unknown' : !h.loggedIn ? 'logged out' : status}</span>
      </button>
      {open && h && <HealthDetails platform={platform} h={h} onClose={() => setOpen(false)} />}
    </>
  );
}

function FailureScreenshot({ path }: { path: string }) {
  const imgQ = useQuery({
    queryKey: ['screenshot', path],
    queryFn: () => window.marketplace.readSafeImageAsDataUrl(path),
    staleTime: 5 * 60 * 1000,
  });
  const filename = path.split(/[/\\]/).pop() ?? path;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <ImageIcon size={11} className="text-muted" />
        <code className="text-[10px] text-muted">{filename}</code>
        <button
          onClick={() => void window.marketplace.revealPath(path)}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-bg px-2 py-0.5 text-[10px] text-muted hover:text-fg"
        >
          <FolderOpen size={10} /> Reveal
        </button>
      </div>
      {imgQ.data && (
        <a href={imgQ.data} target="_blank" rel="noreferrer">
          <img
            src={imgQ.data}
            alt="Failure screenshot"
            className="max-h-48 w-full rounded-md border border-border object-contain"
          />
        </a>
      )}
    </div>
  );
}

function HealthDetails({
  platform,
  h,
  onClose,
}: {
  platform: PlatformId;
  h: PlatformHealth;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const rescanMut = useMutation({
    mutationFn: () => window.marketplace.scanPlatform(platform),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health'] }),
  });

  const resolveMut = useMutation({
    mutationFn: () => window.marketplace.resolveIntervention(platform),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health'] }),
  });

  const screenshot = h.lastErrorScreenshot;
  const lastScan = h.lastScanAt ? new Date(h.lastScanAt).toLocaleString() : 'never';

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-24" onClick={onClose}>
      <div
        className="w-[480px] rounded-lg border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{PLATFORM_DISPLAY_NAMES[platform]} status</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-surface-hover">
            <X size={14} />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
          <dt className="text-muted">Status</dt>
          <dd className="col-span-2 font-medium">{h.status}</dd>
          <dt className="text-muted">Logged in</dt>
          <dd className="col-span-2">{h.loggedIn ? 'Yes' : 'No'}</dd>
          <dt className="text-muted">Last scan</dt>
          <dd className="col-span-2">{lastScan}{h.lastScanAt ? ` · ${h.lastScanSucceeded ? 'succeeded' : 'failed'}` : ''}</dd>
          {h.rateLimitedUntil && (
            <>
              <dt className="text-muted">Rate limited until</dt>
              <dd className="col-span-2">{new Date(h.rateLimitedUntil).toLocaleString()}</dd>
            </>
          )}
        </dl>

        {h.lastErrorMessage && (
          <div className="mt-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-xs">
            <div className="font-medium text-danger">Last error</div>
            <div className="mt-1 whitespace-pre-wrap text-zinc-200">{h.lastErrorMessage}</div>
            {screenshot && <FailureScreenshot path={screenshot} />}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {!h.loggedIn && (
            <button
              onClick={() => {
                onClose();
                navigate(`/onboarding/${platform}`);
              }}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
            >
              <ExternalLink size={11} className="mr-1 inline" />
              Log in
            </button>
          )}
          {h.status === 'paused' && (
            <button
              onClick={() => resolveMut.mutate()}
              disabled={resolveMut.isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {resolveMut.isPending ? <Loader2 size={11} className="inline animate-spin" /> : null}
              {' '}I've resolved it
            </button>
          )}
          <button
            onClick={() => rescanMut.mutate()}
            disabled={rescanMut.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-bg px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-50"
          >
            {rescanMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Rescan
          </button>
        </div>
      </div>
    </div>
  );
}
