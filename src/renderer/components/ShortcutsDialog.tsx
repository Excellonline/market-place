import { useEffect } from 'react';
import { X } from 'lucide-react';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['/', '⌘K', 'Ctrl+K'], label: 'Focus search' },
  { keys: ['?'], label: 'Show this dialog' },
  { keys: ['r'], label: 'Scan now (all platforms)' },
  { keys: ['x'], label: 'Clear search' },
  { keys: ['g', 'd'], label: 'Go to Dashboard' },
  { keys: ['g', 'c'], label: 'Go to Compose' },
  { keys: ['g', 'r'], label: 'Go to Drafts' },
  { keys: ['g', 'a'], label: 'Go to Activity' },
  { keys: ['g', 'e'], label: 'Go to Errors' },
  { keys: ['g', 's'], label: 'Go to Settings' },
  { keys: ['Esc'], label: 'Close dialogs / blur input' },
  { keys: ['Ctrl+V'], label: 'Paste image in Compose' },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-labelledby="shortcuts-title"
      aria-modal="true"
    >
      <div
        className="w-[460px] rounded-lg border border-border bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-base font-semibold">Keyboard shortcuts</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-surface-hover">
            <X size={14} />
          </button>
        </div>
        <ul className="mt-4 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-surface-hover">
              <span className="text-zinc-200">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="rounded-md border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {k}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] text-muted">Shortcuts are muted while typing in an input or textarea.</p>
      </div>
    </div>
  );
}
