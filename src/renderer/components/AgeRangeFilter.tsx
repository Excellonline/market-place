import { useUiStore } from '../store/uiStore';

const PRESETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: 'Any', min: null, max: null },
  { label: 'Fresh (<3d)', min: null, max: 3 },
  { label: 'Aging (3–7d)', min: 3, max: 7 },
  { label: 'Old (>7d)', min: 7, max: null },
];

export function AgeRangeFilter() {
  const minAge = useUiStore((s) => s.minAgeDays);
  const maxAge = useUiStore((s) => s.maxAgeDays);
  const setAgeRange = useUiStore((s) => s.setAgeRange);

  const activeIdx = PRESETS.findIndex((p) => p.min === minAge && p.max === maxAge);

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-surface p-0.5">
      {PRESETS.map((p, i) => (
        <button
          key={p.label}
          onClick={() => setAgeRange(p.min, p.max)}
          className={`rounded px-2 py-1 text-[11px] transition-colors ${
            activeIdx === i ? 'bg-accent/20 text-fg' : 'text-muted hover:text-fg'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
