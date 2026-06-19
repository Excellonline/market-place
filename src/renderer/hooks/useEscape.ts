import { useEffect } from 'react';

/** Call `onEscape` when the user presses Escape, while `active` is true. */
export function useEscape(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}
