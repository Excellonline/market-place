import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Send, Trash2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { PLATFORM_DISPLAY_NAMES, PLATFORM_IDS, type PlatformId } from '@shared/types/platform';
import type { AdDraft, PerPlatformDraftFields } from '@shared/types/ad';
import { adDraftSchema } from '@shared/schemas/adDraft.schema';
import { FACEBOOK_CATEGORIES, FACEBOOK_CONDITIONS, KIJIJI_CATEGORIES, KIJIJI_CONDITIONS } from '@shared/categories';
import { PhotoDropzone } from '../components/PhotoDropzone';

function emptyDraft(): AdDraft {
  return {
    id: nanoid(),
    title: '',
    description: '',
    priceCents: null,
    currency: 'CAD',
    perPlatform: {
      facebook: emptyPerPlatform(),
      kijiji: emptyPerPlatform(),
    },
    photoHashes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function emptyPerPlatform(): PerPlatformDraftFields {
  return { enabled: true, category: null, categoryPath: null, condition: null, priceOverrideCents: null, locationRadiusKm: null };
}

export default function Compose() {
  const { draftId } = useParams<{ draftId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const draftQ = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => (draftId ? window.marketplace.getDraft(draftId) : Promise.resolve(null)),
    enabled: !!draftId,
  });

  const [draft, setDraft] = useState<AdDraft>(emptyDraft);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [publishResults, setPublishResults] = useState<Record<string, { ok: boolean; platformAdId?: string; message?: string }> | null>(null);

  useEffect(() => {
    if (draftQ.data) setDraft(draftQ.data);
  }, [draftQ.data]);

  const saveMut = useMutation({
    mutationFn: () => window.marketplace.saveDraft(draft),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      qc.invalidateQueries({ queryKey: ['draft', saved.id] });
      if (!draftId) navigate(`/compose/${saved.id}`, { replace: true });
    },
  });

  const publishMut = useMutation({
    mutationFn: async () => {
      // Save first, then publish.
      const saved = await window.marketplace.saveDraft(draft);
      const platforms = PLATFORM_IDS.filter((p) => saved.perPlatform[p]?.enabled);
      return window.marketplace.publishDraft(saved.id, platforms);
    },
    onSuccess: (r) => {
      setPublishResults(r.perPlatform);
      qc.invalidateQueries({ queryKey: ['ads'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => window.marketplace.deleteDraft(draft.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drafts'] });
      navigate('/compose');
    },
  });

  function validate(): boolean {
    const r = adDraftSchema.safeParse(draft);
    if (!r.success) {
      setValidationError(r.error.issues[0]?.message ?? 'Invalid draft');
      return false;
    }
    setValidationError(null);
    return true;
  }

  function patch<K extends keyof AdDraft>(key: K, value: AdDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value, updatedAt: Date.now() }));
  }

  function patchPlatform(p: PlatformId, value: Partial<PerPlatformDraftFields>) {
    setDraft((d) => ({
      ...d,
      perPlatform: { ...d.perPlatform, [p]: { ...d.perPlatform[p], ...value } },
      updatedAt: Date.now(),
    }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{draftId ? 'Edit draft' : 'Compose ad'}</h1>
        <div className="flex items-center gap-2">
          {draftId && (
            <button
              onClick={() => {
                if (confirm('Delete this draft?')) deleteMut.mutate();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-900 px-2.5 py-1.5 text-xs text-danger hover:bg-red-950/40"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          <button
            onClick={() => validate() && saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            {saveMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save draft
          </button>
          <button
            onClick={() => validate() && publishMut.mutate()}
            disabled={publishMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {publishMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publish
          </button>
        </div>
      </header>

      {validationError && (
        <div className="flex items-center gap-2 rounded-md border border-amber-900 bg-amber-950/40 px-3 py-2 text-xs text-warn">
          <AlertTriangle size={14} /> {validationError}
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <Field label="Title">
          <input
            type="text"
            maxLength={120}
            value={draft.title}
            onChange={(e) => patch('title', e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={6}
            maxLength={8000}
            value={draft.description}
            onChange={(e) => patch('description', e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Price (CAD)">
          <input
            type="number"
            min="0"
            step="1"
            value={draft.priceCents == null ? '' : String(draft.priceCents / 100)}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === '') patch('priceCents', null);
              else {
                const n = Number(v);
                if (Number.isFinite(n) && n >= 0) patch('priceCents', Math.round(n * 100));
              }
            }}
            placeholder="Free / leave blank"
            className="w-40 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Photos">
          <PhotoDropzone hashes={draft.photoHashes} onChange={(h) => patch('photoHashes', h)} />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-fg">Publish to</h2>
        {PLATFORM_IDS.map((p) => (
          <PlatformPanel
            key={p}
            platform={p}
            fields={draft.perPlatform[p]}
            onChange={(v) => patchPlatform(p, v)}
            globalPriceCents={draft.priceCents}
          />
        ))}
      </section>

      {publishResults && <PublishResults results={publishResults} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PlatformPanel({
  platform,
  fields,
  onChange,
  globalPriceCents,
}: {
  platform: PlatformId;
  fields: PerPlatformDraftFields;
  onChange: (v: Partial<PerPlatformDraftFields>) => void;
  globalPriceCents: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={fields.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="h-4 w-4 accent-indigo-500"
        />
        <span className="text-sm font-medium">{PLATFORM_DISPLAY_NAMES[platform]}</span>
      </label>
      {fields.enabled && (
        <div className="mt-3 space-y-3">
          {platform === 'facebook' && (
            <>
              <Field label="Category">
                <select
                  value={fields.category ?? ''}
                  onChange={(e) => onChange({ category: e.target.value || null })}
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {FACEBOOK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  value={fields.condition ?? ''}
                  onChange={(e) => onChange({ condition: e.target.value || null })}
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {FACEBOOK_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {platform === 'kijiji' && (
            <>
              <Field label="Category path">
                <select
                  value={fields.categoryPath?.join(' > ') ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const match = KIJIJI_CATEGORIES.find((c) => c.path.join(' > ') === v);
                    onChange({ categoryPath: match?.path ?? null, category: match?.label ?? null });
                  }}
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {KIJIJI_CATEGORIES.map((c) => (
                    <option key={c.label} value={c.path.join(' > ')}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Condition">
                <select
                  value={fields.condition ?? ''}
                  onChange={(e) => onChange({ condition: e.target.value || null })}
                  className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
                >
                  <option value="">— Select —</option>
                  {KIJIJI_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label={`Price override (CAD) — leave blank to use global ${globalPriceCents == null ? '(Free)' : `($${(globalPriceCents / 100).toFixed(0)})`}`}>
            <input
              type="number"
              min="0"
              step="1"
              value={fields.priceOverrideCents == null ? '' : String(fields.priceOverrideCents / 100)}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (v === '') onChange({ priceOverrideCents: null });
                else {
                  const n = Number(v);
                  if (Number.isFinite(n) && n >= 0) onChange({ priceOverrideCents: Math.round(n * 100) });
                }
              }}
              className="w-40 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function PublishResults({ results }: { results: Record<string, { ok: boolean; platformAdId?: string; message?: string }> }) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">Publish results</h3>
      {Object.entries(results).map(([platform, r]) => (
        <div
          key={platform}
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
            r.ok ? 'border-emerald-900 bg-emerald-950/30 text-success' : 'border-red-900 bg-red-950/30 text-danger'
          }`}
        >
          {r.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <div>
            <div className="font-medium">{PLATFORM_DISPLAY_NAMES[platform as PlatformId] ?? platform}</div>
            {r.ok ? <div className="text-muted">Published · id {r.platformAdId}</div> : <div>{r.message}</div>}
          </div>
        </div>
      ))}
    </section>
  );
}
