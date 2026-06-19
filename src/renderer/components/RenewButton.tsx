import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Clock } from 'lucide-react';
import { toast } from '../store/toastStore';

interface Props {
  adId: string;
  size?: 'sm' | 'md';
}

export function RenewButton({ adId, size = 'sm' }: Props) {
  const qc = useQueryClient();
  const cooldownQ = useQuery({
    queryKey: ['cooldown', adId],
    queryFn: () => window.marketplace.getCooldown(adId),
    refetchInterval: 60_000,
  });

  const renewMut = useMutation({
    mutationFn: () => window.marketplace.renew(adId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ads'] });
      qc.invalidateQueries({ queryKey: ['cooldown', adId] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
      if (r.ok) {
        toast.success('Renewed');
      } else {
        toast.error(r.message ?? 'Renew failed');
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  const c = cooldownQ.data;
  const now = Date.now();
  const cooldownActive = !!c?.nextAllowedAt && c.nextAllowedAt > now;
  const capReached = !!c && c.dailyCount >= c.dailyCap;
  const disabled = cooldownActive || capReached || renewMut.isPending;

  const baseClasses = size === 'sm'
    ? 'rounded-md bg-surface px-2 py-1 text-xs hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50';
  const iconSize = size === 'sm' ? 11 : 12;

  const tooltip = cooldownActive
    ? `Cooldown — available ${formatRelative(c!.nextAllowedAt!)}`
    : capReached
      ? `Daily cap reached (${c.dailyCount}/${c.dailyCap})`
      : c
        ? `${c.dailyCount}/${c.dailyCap} actions today`
        : '';

  return (
    <button
      onClick={() => renewMut.mutate()}
      disabled={disabled}
      title={tooltip}
      className={baseClasses}
    >
      {renewMut.isPending ? (
        <Loader2 size={iconSize} className="inline animate-spin" />
      ) : cooldownActive ? (
        <Clock size={iconSize} className="inline" />
      ) : (
        <RefreshCw size={iconSize} className="inline" />
      )}
      {size === 'md' && <span>Renew</span>}
      {size === 'sm' && <span className="ml-1">Renew</span>}
    </button>
  );
}

function formatRelative(target: number): string {
  const diff = target - Date.now();
  if (diff < 0) return 'now';
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}
