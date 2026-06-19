import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';

export function FirstRunWarning() {
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => window.marketplace.getSettings() });
  const ack = useMutation({
    mutationFn: () => window.marketplace.setSetting('tos_acknowledged', true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (!settingsQ.data) return null;
  if (settingsQ.data.tos_acknowledged === true) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[520px] rounded-lg border border-amber-900 bg-surface p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-warn">
          <AlertTriangle size={18} />
          <h2 className="text-base font-semibold">Before you start</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm text-zinc-200">
          <p>
            This tool drives a real Chromium browser against your personal Facebook and Kijiji accounts to read and repost
            your listings. <strong>This is against Facebook's Terms of Service</strong> and a small but non-zero number
            of accounts get flagged or banned for any automation activity, even with conservative settings.
          </p>
          <p>
            The safeguards in place — headed browser, human-like delays, no parallel sessions, per-ad cooldowns, daily action
            caps — substantially reduce this risk, but they don't eliminate it. Use an account you can afford to lose.
          </p>
          <p className="text-muted">
            Kijiji is generally more tolerant but also detects and rate-limits aggressive activity.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => ack.mutate()}
            disabled={ack.isPending}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}
