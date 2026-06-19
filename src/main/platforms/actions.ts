import { platformQueue } from '../scheduler/queue';
import { getAdapter } from './registry';
import { adsRepo, draftsRepo, historyRepo, photosRepo, settingsRepo } from '../db/repos';
import { CooldownError, DailyCapReached } from './errors';
import type { PlatformId } from '@shared/types/platform';
import { todayLocalMidnightMs } from './humanize';
import type { AdDraft, RenewResult } from '@shared/types/ad';
import { resolvePhotoPath } from '../photos/store';
import { createId } from '../ids';
import { logger } from '../logger';

function cooldownHours(): number {
  return Number(settingsRepo.get('per_ad_cooldown_hours') ?? 12);
}
function dailyCap(platform: PlatformId): number {
  return Number(settingsRepo.get(`daily_action_cap.${platform}`) ?? 20);
}

function checkCooldown(logicalAdId: string): void {
  const lastAt = historyRepo.lastActionAt(logicalAdId);
  if (!lastAt) return;
  const next = lastAt + cooldownHours() * 3600_000;
  if (Date.now() < next) throw new CooldownError(logicalAdId, next);
}

function checkSnooze(adId: string): void {
  const ad = adsRepo.findById(adId);
  if (!ad || !ad.snoozedUntil) return;
  if (Date.now() < ad.snoozedUntil) {
    throw new Error(`Snoozed until ${new Date(ad.snoozedUntil).toLocaleString()}`);
  }
}

function checkDailyCap(platform: PlatformId): void {
  const since = todayLocalMidnightMs();
  const count = historyRepo.countActions(platform, since);
  const cap = dailyCap(platform);
  if (count >= cap) throw new DailyCapReached(platform, cap);
}

export async function renewAd(adId: string): Promise<{ ok: boolean; message?: string; result?: RenewResult }> {
  const ad = adsRepo.findById(adId);
  if (!ad || !ad.platformAdId) return { ok: false, message: 'Ad not found' };
  try {
    checkSnooze(adId);
    checkCooldown(ad.logicalAdId);
    checkDailyCap(ad.platform);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }

  return platformQueue.enqueue(ad.platform, async (session) => {
    const adapter = getAdapter(ad.platform);
    try {
      const result = await adapter.renew(session, ad.platformAdId!);
      const success = result === 'renewed';
      if (success) {
        adsRepo.update(ad.id, { lastRenewedAt: Date.now() });
      }
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'renew',
        success,
        errorCode: null,
        errorMessage: success ? null : `renew returned ${result}`,
        beforeAdId: ad.platformAdId,
        afterAdId: success ? ad.platformAdId : null,
      });
      return { ok: success, result, message: success ? undefined : `Platform returned: ${result}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'renew',
        success: false,
        errorCode: null,
        errorMessage: message,
        beforeAdId: ad.platformAdId,
        afterAdId: null,
      });
      return { ok: false, message };
    }
  });
}

export async function deleteAd(adId: string): Promise<{ ok: boolean; message?: string }> {
  const ad = adsRepo.findById(adId);
  if (!ad || !ad.platformAdId) return { ok: false, message: 'Ad not found' };

  return platformQueue.enqueue(ad.platform, async (session) => {
    const adapter = getAdapter(ad.platform);
    try {
      await adapter.delete(session, ad.platformAdId!);
      adsRepo.markStatus(ad.id, 'deleted');
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'delete',
        success: true,
        errorCode: null,
        errorMessage: null,
        beforeAdId: ad.platformAdId,
        afterAdId: null,
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'delete',
        success: false,
        errorCode: null,
        errorMessage: message,
        beforeAdId: ad.platformAdId,
        afterAdId: null,
      });
      return { ok: false, message };
    }
  });
}

/** Resolve hashes → on-disk file paths, skipping any that are missing. */
function photoPaths(hashes: string[]): string[] {
  const paths: string[] = [];
  for (const h of hashes) {
    const p = resolvePhotoPath(h);
    if (p) paths.push(p);
  }
  return paths;
}

/** Build an AdDraft-shaped object from an existing Ad and its photos — used for repost-by-recreate. */
function draftFromAd(adId: string): AdDraft | null {
  const ad = adsRepo.findById(adId);
  if (!ad) return null;
  const photos = photosRepo.findByAdId(adId);
  return {
    id: createId(),
    title: ad.title,
    description: ad.description,
    priceCents: ad.priceCents,
    currency: ad.currency,
    perPlatform: {
      facebook: {
        enabled: ad.platform === 'facebook',
        category: ad.platform === 'facebook' ? ad.category : null,
        categoryPath: null,
        condition: null,
        priceOverrideCents: null,
        locationRadiusKm: null,
      },
      kijiji: {
        enabled: ad.platform === 'kijiji',
        category: ad.platform === 'kijiji' ? ad.category : null,
        categoryPath: ad.category?.split(' > ') ?? null,
        condition: null,
        priceOverrideCents: null,
        locationRadiusKm: null,
      },
    },
    photoHashes: photos.map((p) => p.photoHash),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function publishDraft(
  draftId: string,
  platforms: PlatformId[],
): Promise<{ ok: boolean; perPlatform: Record<string, { ok: boolean; platformAdId?: string; message?: string }> }> {
  const draft = draftsRepo.findById(draftId);
  if (!draft) return { ok: false, perPlatform: {} };
  const logicalAdId = createId();
  return publishDraftCore(draft, platforms, logicalAdId);
}

async function publishDraftCore(
  draft: AdDraft,
  platforms: PlatformId[],
  logicalAdId: string,
): Promise<{ ok: boolean; perPlatform: Record<string, { ok: boolean; platformAdId?: string; message?: string }> }> {
  const photoFiles = photoPaths(draft.photoHashes);
  const perPlatform: Record<string, { ok: boolean; platformAdId?: string; message?: string }> = {};

  for (const p of platforms) {
    const fields = draft.perPlatform[p];
    if (!fields?.enabled) continue;
    try {
      checkDailyCap(p);
    } catch (err) {
      perPlatform[p] = { ok: false, message: err instanceof Error ? err.message : String(err) };
      continue;
    }

    perPlatform[p] = await platformQueue.enqueue(p, async (session) => {
      const adapter = getAdapter(p);
      try {
        const result = await adapter.create(session, draft, photoFiles);
        const ad = adsRepo.upsertByPlatformId(p, result.platformAdId, {
          logicalAdId,
          title: draft.title,
          description: draft.description,
          priceCents: fields.priceOverrideCents ?? draft.priceCents,
          currency: draft.currency,
          category: fields.category ?? fields.categoryPath?.join(' > ') ?? null,
          status: 'active',
          url: result.url,
          postedAt: Date.now(),
          lastScrapedAt: Date.now(),
        });
        photosRepo.setForAd(ad.id, draft.photoHashes.map((h) => ({ hash: h })));
        historyRepo.record({
          logicalAdId,
          platform: p,
          action: 'create',
          success: true,
          errorCode: null,
          errorMessage: null,
          beforeAdId: null,
          afterAdId: result.platformAdId,
        });
        return { ok: true, platformAdId: result.platformAdId };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger().error({ err, platform: p }, 'create failed');
        historyRepo.record({
          logicalAdId,
          platform: p,
          action: 'create',
          success: false,
          errorCode: null,
          errorMessage: message,
          beforeAdId: null,
          afterAdId: null,
        });
        return { ok: false, message };
      }
    });
  }

  return { ok: Object.values(perPlatform).every((r) => r.ok), perPlatform };
}

/** Re-scrape a single ad from its platform. Updates the local row + photos. */
export async function rescanAd(adId: string): Promise<{ ok: boolean; message?: string }> {
  const ad = adsRepo.findById(adId);
  if (!ad || !ad.platformAdId) return { ok: false, message: 'Ad not found' };

  return platformQueue.enqueue(ad.platform, async (session) => {
    const adapter = getAdapter(ad.platform);
    try {
      const scraped = await adapter.getAd(session, ad.platformAdId!);
      adsRepo.update(ad.id, {
        title: scraped.title || ad.title,
        description: scraped.description || ad.description,
        priceCents: scraped.priceCents ?? ad.priceCents,
        category: scraped.category ?? ad.category,
        status: scraped.status,
        url: scraped.url,
        views: scraped.views ?? ad.views,
        postedAt: scraped.postedAt || ad.postedAt,
        lastScrapedAt: Date.now(),
      });
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'scan',
        success: true,
        errorCode: null,
        errorMessage: null,
        beforeAdId: ad.platformAdId,
        afterAdId: ad.platformAdId,
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      historyRepo.record({
        logicalAdId: ad.logicalAdId,
        platform: ad.platform,
        action: 'scan',
        success: false,
        errorCode: null,
        errorMessage: message,
        beforeAdId: ad.platformAdId,
        afterAdId: null,
      });
      logger().warn({ err, adId }, 'rescanAd failed');
      return { ok: false, message };
    }
  });
}

/** Re-run an action that previously failed. Looks up the logical ad and replays the same op. */
export async function retryFromHistory(historyEntry: { action: string; logicalAdId: string }): Promise<{ ok: boolean; message?: string }> {
  // Find the active row for this logical_ad_id.
  const siblings = adsRepo.findByLogicalId(historyEntry.logicalAdId);
  const target = siblings.find((s) => s.status === 'active') ?? siblings[0];
  if (!target) return { ok: false, message: 'No active ad found for this entry' };
  switch (historyEntry.action) {
    case 'renew':  return renewAd(target.id);
    case 'delete': return deleteAd(target.id);
    case 'repost': {
      const r = await repostAd(target.id);
      return { ok: r.ok, message: r.message };
    }
    case 'scan':   return rescanAd(target.id);
    case 'create': return { ok: false, message: 'Re-running a create needs a draft. Use Compose instead.' };
    default:       return { ok: false, message: `Cannot replay action: ${historyEntry.action}` };
  }
}

export async function repostAd(adId: string): Promise<{ ok: boolean; newAdId?: string; message?: string }> {
  const ad = adsRepo.findById(adId);
  if (!ad || !ad.platformAdId) return { ok: false, message: 'Ad not found' };

  try {
    checkSnooze(adId);
    checkCooldown(ad.logicalAdId);
    checkDailyCap(ad.platform);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }

  const strategy = String(settingsRepo.get(`repost_strategy.${ad.platform}`) ?? 'renew_first');

  // 1. Try renew first if strategy allows.
  if (strategy === 'renew_first' || strategy === 'renew_only') {
    const r = await renewAd(adId);
    if (r.ok) return { ok: true, newAdId: adId, message: 'Renewed via platform' };
    if (strategy === 'renew_only') return { ok: false, message: r.message ?? 'Renew failed' };
  }

  // 2. Delete + recreate, preserving logical_ad_id.
  const draft = draftFromAd(adId);
  if (!draft) return { ok: false, message: 'Could not build draft from ad' };

  const deleted = await deleteAd(adId);
  if (!deleted.ok) return { ok: false, message: `Delete failed: ${deleted.message}` };

  const created = await publishDraftCore(draft, [ad.platform], ad.logicalAdId);
  const r = created.perPlatform[ad.platform];
  if (r?.ok) {
    historyRepo.record({
      logicalAdId: ad.logicalAdId,
      platform: ad.platform,
      action: 'repost',
      success: true,
      errorCode: null,
      errorMessage: null,
      beforeAdId: ad.platformAdId,
      afterAdId: r.platformAdId ?? null,
    });
    return { ok: true, newAdId: r.platformAdId };
  }
  historyRepo.record({
    logicalAdId: ad.logicalAdId,
    platform: ad.platform,
    action: 'repost',
    success: false,
    errorCode: null,
    errorMessage: r?.message ?? 'recreate failed',
    beforeAdId: ad.platformAdId,
    afterAdId: null,
  });
  return { ok: false, message: r?.message ?? 'Recreate failed after delete' };
}
