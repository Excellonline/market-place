import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub electron before any imports of code that touches `paths`.
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return require('node:os').tmpdir() + '/marketplace-test-' + Math.random().toString(36).slice(2);
      }
      return '/tmp';
    },
  },
  Notification: { isSupported: () => false },
}));

// Stub Playwright — actions.ts imports it transitively through BrowserSession + adapters.
vi.mock('playwright', () => ({
  chromium: { launchPersistentContext: vi.fn() },
}));

// Hand-built mock adapter that the platformQueue will call.
const fakeRenew = vi.fn();
const fakeDelete = vi.fn();
const fakeCreate = vi.fn();

vi.mock('../../src/main/platforms/registry', () => ({
  getAdapter: (id: string) => ({
    id,
    displayName: id,
    attachSession: vi.fn().mockResolvedValue({ platform: id, close: vi.fn() }),
    interactiveLogin: vi.fn(),
    isLoggedIn: vi.fn().mockResolvedValue(true),
    listMyAds: vi.fn().mockResolvedValue([]),
    getAd: vi.fn(),
    renew: fakeRenew,
    delete: fakeDelete,
    create: fakeCreate,
    healthCheck: vi.fn(),
  }),
  allAdapters: () => [
    { id: 'facebook' },
    { id: 'kijiji' },
  ],
}));

// We need launchPersistent to return a dummy session — patch BrowserSession.
vi.mock('../../src/main/platforms/BrowserSession', async () => {
  const actual = await vi.importActual<typeof import('../../src/main/platforms/BrowserSession')>(
    '../../src/main/platforms/BrowserSession',
  );
  return {
    ...actual,
    launchPersistent: vi.fn().mockResolvedValue({
      platform: 'facebook',
      context: { close: vi.fn() },
      page: {},
      close: vi.fn(),
    }),
  };
});

import { initDb, closeDb } from '../../src/main/db';
import { adsRepo } from '../../src/main/db/repos/ads.repo';
import { historyRepo } from '../../src/main/db/repos/history.repo';
import { settingsRepo } from '../../src/main/db/repos/settings.repo';
import { renewAd, deleteAd } from '../../src/main/platforms/actions';
import { adsRepo as adsRepoForSnooze } from '../../src/main/db/repos/ads.repo';

describe('actions orchestration', () => {
  beforeEach(() => {
    initDb(':memory:');
    fakeRenew.mockReset();
    fakeDelete.mockReset();
    fakeCreate.mockReset();
    // Make cooldown irrelevant for these tests.
    settingsRepo.set('per_ad_cooldown_hours', 0);
  });
  afterEach(() => closeDb());

  function seedAd(id = 'a1', platform: 'facebook' | 'kijiji' = 'kijiji') {
    return adsRepo.insert({
      logicalAdId: 'logical-' + id,
      platform,
      platformAdId: 'p-' + id,
      title: 't-' + id,
      description: '',
      priceCents: null,
      currency: 'CAD',
      category: null,
      status: 'active',
      url: null,
      views: null,
      postedAt: Date.now() - 10 * 86400_000,
      lastRenewedAt: null,
      lastScrapedAt: null,
    });
  }

  it('renewAd success records history and updates lastRenewedAt', async () => {
    const ad = seedAd();
    fakeRenew.mockResolvedValue('renewed');
    const r = await renewAd(ad.id);
    expect(r.ok).toBe(true);
    const updated = adsRepo.findById(ad.id)!;
    expect(updated.lastRenewedAt).toBeTruthy();
    const hist = historyRepo.forLogical(ad.logicalAdId);
    expect(hist[0]?.action).toBe('renew');
    expect(hist[0]?.success).toBe(true);
  });

  it('renewAd not_supported is recorded as failure', async () => {
    const ad = seedAd();
    fakeRenew.mockResolvedValue('not_supported');
    const r = await renewAd(ad.id);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not_supported/);
    const hist = historyRepo.forLogical(ad.logicalAdId);
    expect(hist[0]?.success).toBe(false);
  });

  it('renewAd respects daily cap', async () => {
    settingsRepo.set('daily_action_cap.kijiji', 1);
    const ad = seedAd();
    fakeRenew.mockResolvedValue('renewed');
    const r1 = await renewAd(ad.id);
    expect(r1.ok).toBe(true);
    const ad2 = seedAd('a2');
    const r2 = await renewAd(ad2.id);
    expect(r2.ok).toBe(false);
    expect(r2.message).toMatch(/cap reached/i);
  });

  it('renewAd respects per-ad cooldown', async () => {
    settingsRepo.set('per_ad_cooldown_hours', 24);
    const ad = seedAd();
    historyRepo.record({
      logicalAdId: ad.logicalAdId,
      platform: 'kijiji',
      action: 'renew',
      success: true,
      errorCode: null,
      errorMessage: null,
      beforeAdId: null,
      afterAdId: null,
    });
    const r = await renewAd(ad.id);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/cooldown/i);
    expect(fakeRenew).not.toHaveBeenCalled();
  });

  it('deleteAd marks the row deleted and records history', async () => {
    const ad = seedAd();
    fakeDelete.mockResolvedValue(undefined);
    const r = await deleteAd(ad.id);
    expect(r.ok).toBe(true);
    expect(adsRepo.findById(ad.id)?.status).toBe('deleted');
    const hist = historyRepo.forLogical(ad.logicalAdId);
    expect(hist[0]?.action).toBe('delete');
    expect(hist[0]?.success).toBe(true);
  });

  it('deleteAd propagates platform error as failure', async () => {
    const ad = seedAd();
    fakeDelete.mockRejectedValue(new Error('platform broke'));
    const r = await deleteAd(ad.id);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/platform broke/);
    const hist = historyRepo.forLogical(ad.logicalAdId);
    expect(hist[0]?.success).toBe(false);
  });

  it('renewAd refuses while ad is snoozed', async () => {
    const ad = seedAd();
    adsRepoForSnooze.setSnooze(ad.id, Date.now() + 3600_000);
    fakeRenew.mockResolvedValue('renewed');
    const r = await renewAd(ad.id);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/snoozed/i);
    expect(fakeRenew).not.toHaveBeenCalled();
  });

  it('repostAd renew-first succeeds without recreate when renew works', async () => {
    settingsRepo.set('repost_strategy.kijiji', 'renew_first');
    const { repostAd } = await import('../../src/main/platforms/actions');
    const ad = seedAd();
    fakeRenew.mockResolvedValue('renewed');
    const r = await repostAd(ad.id);
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/renew/i);
    expect(fakeDelete).not.toHaveBeenCalled();
    expect(fakeCreate).not.toHaveBeenCalled();
  });

  it('repostAd renew_only fails when renew fails (no recreate)', async () => {
    settingsRepo.set('repost_strategy.kijiji', 'renew_only');
    const { repostAd } = await import('../../src/main/platforms/actions');
    const ad = seedAd();
    fakeRenew.mockResolvedValue('not_supported');
    const r = await repostAd(ad.id);
    expect(r.ok).toBe(false);
    expect(fakeDelete).not.toHaveBeenCalled();
    expect(fakeCreate).not.toHaveBeenCalled();
  });

  it('repostAd refuses while ad is snoozed (regression: prevents delete+recreate fallback firing)', async () => {
    settingsRepo.set('repost_strategy.kijiji', 'renew_first');
    const { repostAd } = await import('../../src/main/platforms/actions');
    const ad = seedAd();
    adsRepoForSnooze.setSnooze(ad.id, Date.now() + 3600_000);
    fakeRenew.mockResolvedValue('renewed');
    fakeDelete.mockResolvedValue(undefined);
    fakeCreate.mockResolvedValue({ platformAdId: 'p-new', url: '' });
    const r = await repostAd(ad.id);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/snoozed/i);
    expect(fakeRenew).not.toHaveBeenCalled();
    expect(fakeDelete).not.toHaveBeenCalled();
    expect(fakeCreate).not.toHaveBeenCalled();
  });

  it('repostAd delete_and_recreate runs delete then create, preserving logical_ad_id', async () => {
    settingsRepo.set('repost_strategy.kijiji', 'delete_and_recreate');
    const { repostAd } = await import('../../src/main/platforms/actions');
    const ad = seedAd();
    fakeDelete.mockResolvedValue(undefined);
    fakeCreate.mockResolvedValue({ platformAdId: 'p-new', url: 'https://kijiji.example/p-new' });

    const r = await repostAd(ad.id);
    expect(r.ok).toBe(true);
    expect(r.newAdId).toBe('p-new');
    expect(fakeDelete).toHaveBeenCalled();
    expect(fakeCreate).toHaveBeenCalled();

    // The old row is marked deleted, a new row exists with the same logical_ad_id.
    const refetchedOld = adsRepoForSnooze.findById(ad.id)!;
    expect(refetchedOld.status).toBe('deleted');
    const sibs = adsRepoForSnooze.findByLogicalId(ad.logicalAdId);
    const newRow = sibs.find((s) => s.platformAdId === 'p-new')!;
    expect(newRow).toBeTruthy();
    expect(newRow.logicalAdId).toBe(ad.logicalAdId);
    expect(newRow.status).toBe('active');
  });
});
