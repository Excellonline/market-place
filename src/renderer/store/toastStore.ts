import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastLevel = 'info' | 'success' | 'warn' | 'error';

export interface Toast {
  id: string;
  message: string;
  level: ToastLevel;
  createdAt: number;
  ttl: number;            // ms; 0 = sticky
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  push(t: Omit<Toast, 'id' | 'createdAt' | 'ttl'> & { ttl?: number }): string;
  remove(id: string): void;
  clear(): void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(t) {
    const id = nanoid();
    const toast: Toast = {
      id,
      message: t.message,
      level: t.level,
      createdAt: Date.now(),
      ttl: t.ttl ?? (t.level === 'error' ? 8000 : 4000),
      actionLabel: t.actionLabel,
      onAction: t.onAction,
    };
    set({ toasts: [...get().toasts, toast] });
    if (toast.ttl > 0) {
      setTimeout(() => get().remove(id), toast.ttl);
    }
    return id;
  },
  remove(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
  clear() {
    set({ toasts: [] });
  },
}));

/** Convenience helpers — same as `useToastStore.getState().push(...)` but with friendlier callsites. */
export const toast = {
  info: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().push({ message, level: 'info', ...opts }),
  success: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().push({ message, level: 'success', ...opts }),
  warn: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().push({ message, level: 'warn', ...opts }),
  error: (message: string, opts: Partial<Toast> = {}) =>
    useToastStore.getState().push({ message, level: 'error', ...opts }),
};
