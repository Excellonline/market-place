import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, AlertTriangle, ListChecks } from 'lucide-react';

export function StatsStrip() {
  const adsQ = useQuery({
    queryKey: ['ads-totals'],
    queryFn: () => window.marketplace.listAds({ status: ['active'] }),
  });
  const stats30 = useQuery({
    queryKey: ['stats', 30],
    queryFn: () => window.marketplace.getStats(30),
    refetchInterval: 60_000,
  });
  const statsToday = useQuery({
    queryKey: ['stats', 1],
    queryFn: () => window.marketplace.getStats(1),
    refetchInterval: 60_000,
  });

  const activeCount = adsQ.data?.length ?? 0;
  const agingCount = adsQ.data?.filter((a) => a.ageDays >= 7).length ?? 0;
  const todayActions = statsToday.data?.totalActions ?? 0;
  const monthFailures = stats30.data?.failureCount ?? 0;

  if (activeCount === 0 && todayActions === 0 && monthFailures === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 border-b border-border bg-bg/40 px-5 py-2 text-[11px]">
      <Stat icon={<ListChecks size={11} />} label="Active ads" value={activeCount} />
      {agingCount > 0 && <Stat icon={<AlertTriangle size={11} className="text-warn" />} label="Aging (≥7d)" value={agingCount} />}
      <Stat icon={<Activity size={11} className="text-accent" />} label="Actions today" value={todayActions} />
      {monthFailures > 0 && (
        <Stat icon={<AlertTriangle size={11} className="text-danger" />} label="Failures (30d)" value={monthFailures} />
      )}
      {monthFailures === 0 && stats30.data && stats30.data.totalActions > 0 && (
        <Stat icon={<CheckCircle2 size={11} className="text-success" />} label="30-day success rate" value="100%" />
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-muted">{label}</span>
      <span className="font-medium text-fg">{value}</span>
    </div>
  );
}
