import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PLATFORM_IDS, PLATFORM_DISPLAY_NAMES, type PlatformHealth, type PlatformId } from '@shared/types/platform';
import { useNavigate } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import { toast } from '../store/toastStore';

const CRON_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Daily at 6am', value: '0 6 * * *' },
  { label: 'Twice daily (9am, 6pm)', value: '0 9,18 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Hourly (workday 9-5)', value: '0 9-17 * * 1-5' },
  { label: 'Custom…', value: '__custom' },
];

const REPOST_STRATEGIES: Array<{ value: string; label: string }> = [
  { value: 'renew_first', label: 'Renew first → recreate if renew fails' },
  { value: 'delete_and_recreate', label: 'Always delete + recreate' },
  { value: 'renew_only', label: 'Renew only (never recreate)' },
];

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => window.marketplace.getSettings() });
  const healthQ = useQuery({ queryKey: ['health'], queryFn: () => window.marketplace.platformHealth() });

  const setMut = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      await window.marketplace.setSetting(key, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const settings = settingsQ.data ?? {};
  const cronValue = String(settings.scan_cron ?? '0 9 * * *');
  const cronMatchesPreset = CRON_PRESETS.some((p) => p.value === cronValue);
  const cronPresetSelected = cronMatchesPreset ? cronValue : '__custom';
  const scansPaused = settings.scans_paused === true;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PerPlatformPauseSection />

      <section>
        <h2 className="text-base font-semibold">Accounts</h2>
        <p className="mt-1 text-xs text-muted">Log in to each platform once. Your session is stored in a private Chromium profile.</p>
        <div className="mt-4 space-y-2">
          {PLATFORM_IDS.map((p) => {
            const h = healthQ.data?.find((x: PlatformHealth) => x.platform === p);
            return (
              <div key={p} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{PLATFORM_DISPLAY_NAMES[p]}</div>
                  <div className="text-xs text-muted">
                    {!h || !h.loggedIn ? 'Not logged in' : `Logged in · last scan ${h.lastScanAt ? new Date(h.lastScanAt).toLocaleString() : 'never'}`}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/onboarding/${p}`)}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
                >
                  {!h || !h.loggedIn ? 'Log in' : 'Re-login'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Thresholds</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {PLATFORM_IDS.map((p) => (
            <NumberSetting
              key={`age-${p}`}
              label={`Age threshold — ${PLATFORM_DISPLAY_NAMES[p]} (days)`}
              value={Number(settings[`age_threshold_days.${p}`] ?? 7)}
              onChange={(v) => setMut.mutate({ key: `age_threshold_days.${p}`, value: v })}
            />
          ))}
          {PLATFORM_IDS.map((p) => (
            <NumberSetting
              key={`cap-${p}`}
              label={`Daily action cap — ${PLATFORM_DISPLAY_NAMES[p]}`}
              value={Number(settings[`daily_action_cap.${p}`] ?? 20)}
              onChange={(v) => setMut.mutate({ key: `daily_action_cap.${p}`, value: v })}
            />
          ))}
          <NumberSetting
            label="Per-ad cooldown (hours)"
            value={Number(settings.per_ad_cooldown_hours ?? 12)}
            onChange={(v) => setMut.mutate({ key: 'per_ad_cooldown_hours', value: v })}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Repost strategy</h2>
        <div className="mt-4 space-y-3">
          {PLATFORM_IDS.map((p) => (
            <div key={`strat-${p}`} className="rounded-md border border-border bg-surface p-3">
              <label className="block text-xs text-muted">{PLATFORM_DISPLAY_NAMES[p]}</label>
              <select
                value={String(settings[`repost_strategy.${p}`] ?? (p === 'facebook' ? 'delete_and_recreate' : 'renew_first'))}
                onChange={(e) => setMut.mutate({ key: `repost_strategy.${p}`, value: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                {REPOST_STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Schedule</h2>
          <button
            onClick={() => setMut.mutate({ key: 'scans_paused', value: !scansPaused })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              scansPaused
                ? 'bg-success/20 text-success hover:bg-success/30'
                : 'border border-amber-900 text-warn hover:bg-amber-950/30'
            }`}
          >
            {scansPaused ? <><Play size={12} /> Resume</> : <><Pause size={12} /> Pause scheduled scans</>}
          </button>
        </div>
        {scansPaused && (
          <div className="mt-2 rounded-md border border-amber-900 bg-amber-950/30 px-3 py-2 text-xs text-warn">
            Scheduled scans are paused. Manual scans from the dashboard still run.
          </div>
        )}
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-muted">Frequency</label>
            <select
              value={cronPresetSelected}
              onChange={(e) => {
                if (e.target.value === '__custom') return;
                setMut.mutate({ key: 'scan_cron', value: e.target.value });
              }}
              className="mt-1 w-full max-w-md rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {cronPresetSelected === '__custom' && (
            <div>
              <label className="block text-xs text-muted">Custom cron expression</label>
              <input
                type="text"
                defaultValue={cronValue}
                onBlur={(e) => setMut.mutate({ key: 'scan_cron', value: e.target.value })}
                className="mt-1 w-full max-w-md rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm font-mono focus:border-accent focus:outline-none"
                placeholder="0 9 * * *"
              />
              <p className="mt-1 text-[11px] text-muted">5-field cron: minute hour day-of-month month day-of-week</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Notifications</h2>
        <div className="mt-4 space-y-2">
          <BoolToggle
            label="Aging-ad alerts"
            description="After each scan, notify if any ad is past its age threshold."
            value={settings['notify.aging'] !== false}
            onChange={(v) => setMut.mutate({ key: 'notify.aging', value: v })}
          />
          <BoolToggle
            label="Scan errors"
            description="Notify when a scan fails (network, selector breakage, etc.)."
            value={settings['notify.errors'] !== false}
            onChange={(v) => setMut.mutate({ key: 'notify.errors', value: v })}
          />
          <BoolToggle
            label="Captcha / human intervention"
            description="Notify when a platform shows a captcha or security checkpoint."
            value={settings['notify.captcha'] !== false}
            onChange={(v) => setMut.mutate({ key: 'notify.captcha', value: v })}
          />
          <BoolToggle
            label="Scan complete (every time)"
            description="Quiet by default — flip on if you want a confirmation after every successful scan."
            value={settings['notify.scan_complete'] === true}
            onChange={(v) => setMut.mutate({ key: 'notify.scan_complete', value: v })}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void window.marketplace.openUserDataFolder()}
            className="rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            Open user data folder
          </button>
          <button
            onClick={() => void window.marketplace.exportAdsCsv()}
            className="rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            Export ads to CSV
          </button>
          <button
            onClick={() => void window.marketplace.exportActivityCsv()}
            className="rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            Export activity to CSV
          </button>
          <button
            onClick={async () => {
              toast.info('Building backup…');
              const r = await window.marketplace.backupUserData();
              if (r.ok && r.path) {
                const filePath = r.path;
                toast.success(`Backup ready (${formatBytes(r.sizeBytes ?? 0)})`, {
                  actionLabel: 'Reveal',
                  onAction: () => void window.marketplace.revealPath(filePath),
                  ttl: 10_000,
                });
              } else if (r.message) {
                toast.error(`Backup failed: ${r.message}`);
              }
            }}
            className="rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover"
          >
            Backup everything (zip)
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Backup includes ads, drafts, photos, logs. Excludes browser profiles — log in again on the target machine.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-danger">Danger zone</h2>
        <div className="mt-3 space-y-2">
          {PLATFORM_IDS.map((p) => (
            <button
              key={p}
              onClick={() => {
                if (confirm(`Reset ${PLATFORM_DISPLAY_NAMES[p]} profile? You'll need to log in again.`)) {
                  void window.marketplace.resetPlatform(p as PlatformId);
                }
              }}
              className="block rounded-md border border-red-900 px-3 py-1.5 text-sm text-danger hover:bg-red-950/40"
            >
              Reset {PLATFORM_DISPLAY_NAMES[p]} profile
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function PerPlatformPauseSection() {
  const qc = useQueryClient();
  const infoQ = useQuery({
    queryKey: ['schedule-info'],
    queryFn: () => window.marketplace.scheduleInfo(),
    refetchInterval: 30_000,
  });
  const pauseMut = useMutation({
    mutationFn: (args: { platform: PlatformId; until: number | null }) =>
      window.marketplace.pausePlatform(args.platform, args.until),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule-info'] }),
  });

  const PAUSE_PRESETS: Array<{ label: string; hours: number | null }> = [
    { label: '1 hour', hours: 1 },
    { label: '8 hours', hours: 8 },
    { label: '1 day', hours: 24 },
    { label: '1 week', hours: 168 },
  ];

  return (
    <section>
      <h2 className="text-base font-semibold">Per-platform pause</h2>
      <p className="mt-1 text-xs text-muted">
        Skip scheduled scans for one platform without affecting the other. Manual actions from the dashboard still work.
      </p>
      <div className="mt-4 space-y-2">
        {PLATFORM_IDS.map((p) => {
          const pausedUntil = infoQ.data?.platforms?.[p]?.pausedUntil ?? null;
          const isPaused = !!pausedUntil && pausedUntil > Date.now();
          return (
            <div key={p} className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3">
              <div>
                <div className="text-sm font-medium">{PLATFORM_DISPLAY_NAMES[p]}</div>
                <div className="text-xs text-muted">
                  {isPaused
                    ? `Paused until ${new Date(pausedUntil!).toLocaleString()}`
                    : 'Active'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isPaused ? (
                  <button
                    onClick={() => pauseMut.mutate({ platform: p, until: null })}
                    className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
                  >
                    Resume
                  </button>
                ) : (
                  PAUSE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() =>
                        pauseMut.mutate({
                          platform: p,
                          until: Date.now() + (preset.hours ?? 0) * 3600_000,
                        })
                      }
                      className="rounded-md bg-bg px-2 py-1 text-[11px] hover:bg-surface-hover"
                    >
                      {preset.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BoolToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 hover:bg-surface-hover">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-indigo-500"
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </label>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function NumberSetting({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-muted">{label}</label>
      <input
        type="number"
        defaultValue={value}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}
