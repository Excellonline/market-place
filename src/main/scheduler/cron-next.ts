/**
 * Compute the next firing time of a 5-field cron expression by minute-stepping forward.
 * Supports: numbers (5), lists (1,3,5), ranges (1-5), step (* / 5), and *.
 * Does NOT support: month names, weekday names, @daily, L/W/#, etc.
 *
 * Returns unix ms, or null if no match within a year (means the expression matches nothing).
 */
export function nextCronTime(expr: string, from: Date = new Date()): number | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minF, hourF, domF, monF, dowF] = parts as [string, string, string, string, string];

  const minutes = expand(minF, 0, 59);
  const hours = expand(hourF, 0, 23);
  const doms = expand(domF, 1, 31);
  const months = expand(monF, 1, 12);
  const dows = expand(dowF, 0, 6); // 0 = Sun, 6 = Sat; 7 → 0
  if (!minutes || !hours || !doms || !months || !dows) return null;
  if (dows.has(7)) {
    dows.delete(7);
    dows.add(0);
  }

  const d = new Date(from.getTime());
  // Start at the next minute.
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);

  const yearLimit = new Date(d.getTime() + 366 * 86400_000);

  while (d < yearLimit) {
    if (
      minutes.has(d.getMinutes()) &&
      hours.has(d.getHours()) &&
      doms.has(d.getDate()) &&
      months.has(d.getMonth() + 1) &&
      dows.has(d.getDay())
    ) {
      return d.getTime();
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}

function expand(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(',')) {
    let step = 1;
    let body = part;
    const slash = part.indexOf('/');
    if (slash !== -1) {
      step = Number(part.slice(slash + 1));
      body = part.slice(0, slash);
      if (!Number.isFinite(step) || step <= 0) return null;
    }
    let lo: number;
    let hi: number;
    if (body === '*') {
      lo = min;
      hi = max;
    } else if (body.includes('-')) {
      const [a, b] = body.split('-').map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      lo = a as number;
      hi = b as number;
    } else {
      const n = Number(body);
      if (!Number.isFinite(n)) return null;
      lo = n;
      hi = n;
    }
    if (lo < min || hi > max + (max === 6 ? 1 : 0)) return null; // dow allows 7
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}
