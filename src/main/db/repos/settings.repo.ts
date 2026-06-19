import { getDb } from '../index';

export const settingsRepo = {
  get<T = unknown>(key: string, fallback?: T): T | undefined {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return fallback;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): void {
    getDb()
      .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, JSON.stringify(value));
  },

  all(): Record<string, unknown> {
    const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const out: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        out[r.key] = JSON.parse(r.value);
      } catch {
        out[r.key] = r.value;
      }
    }
    return out;
  },
};
