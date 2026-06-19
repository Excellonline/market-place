import { describe, expect, it } from 'vitest';
import { nextCronTime } from '../../src/main/scheduler/cron-next';

describe('nextCronTime', () => {
  it('next 9am from 8am today is today 9am', () => {
    const from = new Date('2026-05-16T08:00:00');
    const next = nextCronTime('0 9 * * *', from);
    expect(next).not.toBeNull();
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.toDateString()).toBe(from.toDateString());
  });

  it('next 9am from 10am today is tomorrow 9am', () => {
    const from = new Date('2026-05-16T10:00:00');
    const next = nextCronTime('0 9 * * *', from);
    const d = new Date(next!);
    expect(d.getHours()).toBe(9);
    expect(d.getDate()).toBe(from.getDate() + 1);
  });

  it('every 6 hours from noon picks 6pm', () => {
    const from = new Date('2026-05-16T12:00:00');
    const next = nextCronTime('0 */6 * * *', from);
    const d = new Date(next!);
    expect(d.getHours()).toBe(18);
  });

  it('twice daily list 9,18 from 9:30 picks 18:00', () => {
    const from = new Date('2026-05-16T09:30:00');
    const next = nextCronTime('0 9,18 * * *', from);
    const d = new Date(next!);
    expect(d.getHours()).toBe(18);
  });

  it('weekday-only hourly skips weekends', () => {
    // 2026-05-16 is a Saturday (dow=6). Next run should land on Mon 9am.
    const from = new Date('2026-05-16T08:00:00');
    const next = nextCronTime('0 9-17 * * 1-5', from);
    const d = new Date(next!);
    expect(d.getDay()).toBe(1); // Mon
    expect(d.getHours()).toBe(9);
  });

  it('returns null for an invalid expression', () => {
    expect(nextCronTime('not a cron', new Date())).toBeNull();
  });

  it('handles dow=0 (Sunday) and dow=7 (also Sunday) equivalently', () => {
    const from = new Date('2026-05-16T08:00:00'); // Sat
    const a = nextCronTime('0 9 * * 0', from);
    const b = nextCronTime('0 9 * * 7', from);
    expect(a).toBe(b);
    if (a !== null) expect(new Date(a).getDay()).toBe(0);
  });

  it('respects list of multiple days of week', () => {
    const from = new Date('2026-05-13T08:00:00'); // Wed
    const next = nextCronTime('0 9 * * 1,3,5', from); // Mon/Wed/Fri
    const d = new Date(next!);
    // From Wed 8am, next match is Wed 9am
    expect(d.getDay()).toBe(3);
    expect(d.getHours()).toBe(9);
  });

  it('handles specific minute precision', () => {
    const from = new Date('2026-05-16T08:15:00');
    const next = nextCronTime('30 8 * * *', from);
    const d = new Date(next!);
    expect(d.getMinutes()).toBe(30);
    expect(d.getHours()).toBe(8);
  });

  it('returns a future time strictly greater than `from`', () => {
    const from = new Date('2026-05-16T08:00:00');
    const next = nextCronTime('0 8 * * *', from); // 8:00 today — should resolve to tomorrow
    expect(next).not.toBeNull();
    expect(next!).toBeGreaterThan(from.getTime());
  });
});
