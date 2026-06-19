import { CheckCircle2, X, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useToastStore, type ToastLevel } from '../store/toastStore';

const styles: Record<ToastLevel, string> = {
  info: 'border-border bg-surface text-fg',
  success: 'border-emerald-900 bg-emerald-950/80 text-success',
  warn: 'border-amber-900 bg-amber-950/80 text-warn',
  error: 'border-red-900 bg-red-950/80 text-danger',
};

const icons: Record<ToastLevel, React.ReactNode> = {
  info: <Info size={14} />,
  success: <CheckCircle2 size={14} />,
  warn: <AlertTriangle size={14} />,
  error: <XCircle size={14} />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[440px] max-w-[90vw] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-2xl backdrop-blur-md ${
            styles[t.level]
          }`}
        >
          <span className="mt-0.5">{icons[t.level]}</span>
          <div className="flex-1 break-words text-zinc-100">{t.message}</div>
          {t.actionLabel && t.onAction && (
            <button
              onClick={() => {
                t.onAction?.();
                remove(t.id);
              }}
              className="rounded-md bg-bg/70 px-2 py-0.5 text-xs font-medium hover:bg-bg"
            >
              {t.actionLabel}
            </button>
          )}
          <button
            onClick={() => remove(t.id)}
            className="rounded-md p-0.5 text-zinc-400 hover:bg-bg/40 hover:text-fg"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
