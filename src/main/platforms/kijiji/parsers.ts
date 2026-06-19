export function parsePriceCents(text: string | null): number | null {
  if (!text) return null;
  const m = text.replace(/[, ]/g, '').match(/(\d+)(?:\.(\d{1,2}))?/);
  if (!m) return null;
  const dollars = Number(m[1]);
  const cents = m[2] ? Number(m[2].padEnd(2, '0')) : 0;
  return dollars * 100 + cents;
}

export function parseKijijiRelativeDate(text: string, now: number = Date.now()): number | null {
  const t = text.toLowerCase();
  if (t.includes('today') || /< ?\d+ ?hour/.test(t)) return now;
  if (t.includes('yesterday')) return now - 86400_000;
  const m = t.match(/(\d+)\s+(hour|day|week)s?\s+ago/);
  if (!m) return null;
  const n = Number(m[1]);
  switch (m[2]) {
    case 'hour': return now - n * 3_600_000;
    case 'day':  return now - n * 86_400_000;
    case 'week': return now - n * 7 * 86_400_000;
    default: return null;
  }
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
