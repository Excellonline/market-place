import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: (n: string) =>
      n === 'userData' ? require('node:os').tmpdir() + '/marketplace-schedule-test-' + Math.random().toString(36).slice(2) : '/tmp',
  },
  BrowserWindow: class {},
  Notification: { isSupported: () => false },
}));

vi.mock('node-cron', () => ({ default: { schedule: () => ({ stop: () => {} }) } }));
vi.mock('playwright', () => ({ chromium: { launchPersistentContext: vi.fn() } }));

import { initDb, closeDb } from '../../src/main/db';
import { settingsRepo } from '../../src/main/db/repos/settings.repo';
import { scheduler } from '../../src/main/scheduler';

describe('scheduler pause', () => {
  beforeEach(() => {
    initDb(':memory:');
  });
  afterEach(() => closeDb());

  it('isPlatformPaused honors paused_until.<platform>', () => {
    expect(scheduler.isPlatformPaused('kijiji')).toBe(false);
    settingsRepo.set('paused_until.kijiji', Date.now() + 60_000);
    expect(scheduler.isPlatformPaused('kijiji')).toBe(true);
    expect(scheduler.isPlatformPaused('facebook')).toBe(false);
  });

  it('isPlatformPaused returns false for stale paused_until', () => {
    settingsRepo.set('paused_until.kijiji', Date.now() - 60_000);
    expect(scheduler.isPlatformPaused('kijiji')).toBe(false);
  });
});
