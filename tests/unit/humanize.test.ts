import { describe, expect, it } from 'vitest';
import { humanDelay, microDelay, todayLocalMidnightMs } from '../../src/main/platforms/humanize';

describe('humanize', () => {
  it('humanDelay resolves within the configured range', async () => {
    const start = Date.now();
    await humanDelay(50, 80);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(200);
  });

  it('microDelay is non-negative', async () => {
    const start = Date.now();
    await microDelay(10, 20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });

  it('todayLocalMidnightMs is at midnight today', () => {
    const ms = todayLocalMidnightMs();
    const d = new Date(ms);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});
