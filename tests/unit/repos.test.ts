import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub electron before anything else imports paths.ts
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return require('node:os').tmpdir() + '/marketplace-test-' + Math.random().toString(36).slice(2);
      }
      return '/tmp';
    },
  },
}));

import { initDb, closeDb } from '../../src/main/db';
import { adsRepo } from '../../src/main/db/repos/ads.repo';
import { historyRepo } from '../../src/main/db/repos/history.repo';
import { settingsRepo } from '../../src/main/db/repos/settings.repo';

describe('repos', () => {
  beforeEach(() => {
    initDb(':memory:');
  });
  afterEach(() => {
    closeDb();
  });

  it('inserts and finds an ad', () => {
    const ad = adsRepo.insert({
      logicalAdId: 'logical-1',
      platform: 'kijiji',
      platformAdId: 'plat-1',
      title: 'Test',
      description: 'A test ad',
      priceCents: 5000,
      currency: 'CAD',
      category: null,
      status: 'active',
      url: 'https://example.com',
      views: null,
      postedAt: Date.now() - 86400_000 * 3, // 3 days ago
      lastRenewedAt: null,
      lastScrapedAt: Date.now(),
    });

    const found = adsRepo.findById(ad.id);
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Test');
    expect(found?.platformAdId).toBe('plat-1');

    const byPlatform = adsRepo.findByPlatformAdId('kijiji', 'plat-1');
    expect(byPlatform?.id).toBe(ad.id);
  });

  it('listForDashboard computes age in days and applies filters', () => {
    adsRepo.insert({
      logicalAdId: 'a',
      platform: 'facebook',
      platformAdId: 'fb-1',
      title: 'Old',
      description: '',
      priceCents: null,
      currency: 'CAD',
      category: null,
      status: 'active',
      url: null,
      views: null,
      postedAt: Date.now() - 86400_000 * 10,
      lastRenewedAt: null,
      lastScrapedAt: null,
    });
    adsRepo.insert({
      logicalAdId: 'b',
      platform: 'kijiji',
      platformAdId: 'kj-1',
      title: 'Fresh',
      description: '',
      priceCents: null,
      currency: 'CAD',
      category: null,
      status: 'active',
      url: null,
      views: null,
      postedAt: Date.now() - 86400_000 * 1,
      lastRenewedAt: null,
      lastScrapedAt: null,
    });

    const all = adsRepo.listForDashboard({});
    expect(all).toHaveLength(2);
    const old = all.find((a) => a.title === 'Old')!;
    // SQL strftime('%s','now') has 1-second precision so the truncated day count can be 9 or 10.
    expect(old.ageDays).toBeGreaterThanOrEqual(9);
    expect(old.ageDays).toBeLessThanOrEqual(10);

    const byPlatform = adsRepo.listForDashboard({ platforms: ['kijiji'] });
    expect(byPlatform).toHaveLength(1);
    expect(byPlatform[0]!.title).toBe('Fresh');

    const oldOnly = adsRepo.listForDashboard({ minAgeDays: 5 });
    expect(oldOnly).toHaveLength(1);
    expect(oldOnly[0]!.title).toBe('Old');
  });

  it('upsertByPlatformId updates existing rows', () => {
    const a = adsRepo.upsertByPlatformId('kijiji', 'kj-x', { title: 'v1', postedAt: 100 });
    const b = adsRepo.upsertByPlatformId('kijiji', 'kj-x', { title: 'v2' });
    expect(a.id).toBe(b.id);
    expect(adsRepo.findById(a.id)?.title).toBe('v2');
  });

  it('update() skips undefined fields but applies null', () => {
    const ad = adsRepo.insert({
      logicalAdId: 'logical-1',
      platform: 'kijiji',
      platformAdId: 'p-undef',
      title: 'orig',
      description: '',
      priceCents: 5000,
      currency: 'CAD',
      category: 'cat',
      status: 'active',
      url: null,
      views: 42,
      postedAt: 1,
      lastRenewedAt: null,
      lastScrapedAt: null,
    });

    // undefined should leave fields untouched
    adsRepo.update(ad.id, { title: undefined, logicalAdId: undefined, views: undefined });
    let r = adsRepo.findById(ad.id)!;
    expect(r.title).toBe('orig');
    expect(r.logicalAdId).toBe('logical-1');
    expect(r.views).toBe(42);

    // null should clear the field
    adsRepo.update(ad.id, { views: null, category: null });
    r = adsRepo.findById(ad.id)!;
    expect(r.views).toBeNull();
    expect(r.category).toBeNull();
    // unrelated fields untouched
    expect(r.title).toBe('orig');
  });

  it('upsertByPlatformId with logicalAdId=undefined does not overwrite the existing logical id', () => {
    const a = adsRepo.upsertByPlatformId('kijiji', 'kj-y', {
      logicalAdId: 'keep-me',
      title: 'v1',
      postedAt: 100,
    });
    expect(a.logicalAdId).toBe('keep-me');
    // simulate the scheduler's call where existing is found and logicalAdId is undefined
    adsRepo.upsertByPlatformId('kijiji', 'kj-y', {
      logicalAdId: undefined,
      title: 'v2',
    });
    const after = adsRepo.findByPlatformAdId('kijiji', 'kj-y')!;
    expect(after.logicalAdId).toBe('keep-me'); // not overwritten
    expect(after.title).toBe('v2');
  });

  it('history.countActions filters by platform and since', () => {
    historyRepo.record({
      logicalAdId: 'L',
      platform: 'kijiji',
      action: 'renew',
      success: true,
      errorCode: null,
      errorMessage: null,
      beforeAdId: null,
      afterAdId: null,
    });
    historyRepo.record({
      logicalAdId: 'L',
      platform: 'kijiji',
      action: 'scan',
      success: true,
      errorCode: null,
      errorMessage: null,
      beforeAdId: null,
      afterAdId: null,
    });
    expect(historyRepo.countActions('kijiji', 0)).toBe(1); // 'scan' excluded
    expect(historyRepo.countActions('facebook', 0)).toBe(0);
  });

  it('settings roundtrip JSON', () => {
    settingsRepo.set('foo', { a: 1, b: [2, 3] });
    expect(settingsRepo.get<{ a: number }>('foo')).toEqual({ a: 1, b: [2, 3] });

    // Seeded defaults from migration
    expect(settingsRepo.get<string>('repost_strategy.kijiji')).toBe('renew_first');
    expect(settingsRepo.get<number>('age_threshold_days.facebook')).toBe(7);
  });
});
