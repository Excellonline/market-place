interface Props {
  days: number;
  thresholdDays?: number;
}

export function AgeBadge({ days, thresholdDays = 7 }: Props) {
  const ratio = days / thresholdDays;
  const color =
    ratio < 0.5
      ? 'text-emerald-300 bg-emerald-950/50 border-emerald-900'
      : ratio < 1
        ? 'text-amber-300 bg-amber-950/50 border-amber-900'
        : 'text-red-300 bg-red-950/50 border-red-900';
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${color}`}>
      {days}d
    </span>
  );
}
