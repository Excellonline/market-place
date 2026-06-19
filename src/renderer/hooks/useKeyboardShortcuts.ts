import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../store/uiStore';

export interface ShortcutsState {
  setShortcutsOpen(open: boolean): void;
}

/**
 * Returns true if focus is currently in an editable element where shortcuts should be muted.
 */
function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function useKeyboardShortcuts(setShortcutsOpen: (b: boolean) => void) {
  const navigate = useNavigate();
  const setSearch = useUiStore((s) => s.setSearch);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Mute most shortcuts while typing — except Escape.
      const inEditable = isEditableTarget(e.target);

      if (e.key === 'Escape') {
        // Don't intercept Escape in inputs — let them blur naturally.
        return;
      }
      if (inEditable) return;

      // Allow Cmd/Ctrl+K regardless (let it run even if focused — but global handler skipped above).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[type="search"]');
        input?.focus();
        return;
      }

      // No modifier shortcuts below here.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
          break;
        case '?':
          e.preventDefault();
          setShortcutsOpen(true);
          break;
        case 'g':
          // Two-stroke: g + d/c/a/e/s for goto. Wait for second key.
          handleGoto((target) => navigate(target));
          break;
        case 'r':
          // Trigger scan now
          e.preventDefault();
          void window.marketplace.scanAll();
          break;
        case 'x':
          // Clear search
          e.preventDefault();
          setSearch('');
          break;
      }
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate, setSearch, setShortcutsOpen]);
}

function handleGoto(go: (target: string) => void): void {
  function once(e: KeyboardEvent) {
    if (isEditableTarget(e.target)) return;
    document.removeEventListener('keydown', once);
    switch (e.key) {
      case 'd': go('/'); break;
      case 'c': go('/compose'); break;
      case 'a': go('/activity'); break;
      case 'e': go('/errors'); break;
      case 's': go('/settings'); break;
      case 'r': go('/drafts'); break;
    }
  }
  document.addEventListener('keydown', once);
  setTimeout(() => document.removeEventListener('keydown', once), 1200);
}
