import { getDb } from '../index';
import type { Ad, AdFilter, AdStatus, AdView } from '@shared/types/ad';
import type { PlatformId } from '@shared/types/platform';
import { createId } from '../../ids';

interface AdRow {
  id: string;
  logical_ad_id: string;
  platform: string;
  platform_ad_id: string | null;
  title: string;
  description: string;
  price_cents: number | null;
  currency: string;
  category: string | null;
  status: string;
  url: string | null;
  views: number | null;
  posted_at: number;
  last_renewed_at: number | null;
  last_scraped_at: number | null;
  snoozed_until: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

function rowToAd(r: AdRow): Ad {
  return {
    id: r.id,
    logicalAdId: r.logical_ad_id,
    platform: r.platform as PlatformId,
    platformAdId: r.platform_ad_id,
    title: r.title,
    description: r.description,
    priceCents: r.price_cents,
    currency: r.currency,
    category: r.category,
    status: r.status as AdStatus,
    url: r.url,
    views: r.views,
    postedAt: r.posted_at,
    lastRenewedAt: r.last_renewed_at,
    lastScrapedAt: r.last_scraped_at,
    snoozedUntil: r.snoozed_until,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const adsRepo = {
  insert(ad: Omit<Ad, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Ad {
    const now = Date.now();
    const id = ad.id ?? createId();
    getDb()
      .prepare(
        `INSERT INTO ads (id, logical_ad_id, platform, platform_ad_id, title, description, price_cents,
                          currency, category, status, url, views, posted_at, last_renewed_at, last_scraped_at,
                          snoozed_until, notes, created_at, updated_at)
         VALUES (@id, @logical_ad_id, @platform, @platform_ad_id, @title, @description, @price_cents,
                 @currency, @category, @status, @url, @views, @posted_at, @last_renewed_at, @last_scraped_at,
                 @snoozed_until, @notes, @created_at, @updated_at)`,
      )
      .run({
        id,
        logical_ad_id: ad.logicalAdId,
        platform: ad.platform,
        platform_ad_id: ad.platformAdId,
        title: ad.title,
        description: ad.description,
        price_cents: ad.priceCents,
        currency: ad.currency,
        category: ad.category,
        status: ad.status,
        url: ad.url,
        views: ad.views,
        posted_at: ad.postedAt,
        last_renewed_at: ad.lastRenewedAt,
        last_scraped_at: ad.lastScrapedAt,
        snoozed_until: 'snoozedUntil' in ad ? (ad as { snoozedUntil: number | null }).snoozedUntil : null,
        notes: 'notes' in ad ? (ad as { notes: string | null }).notes : null,
        created_at: now,
        updated_at: now,
      });
    return { ...ad, id, createdAt: now, updatedAt: now } as Ad;
  },

  upsertByPlatformId(platform: PlatformId, platformAdId: string, patch: Partial<Omit<Ad, 'id' | 'createdAt'>>): Ad {
    const existing = adsRepo.findByPlatformAdId(platform, platformAdId);
    if (existing) {
      adsRepo.update(existing.id, patch);
      return adsRepo.findById(existing.id)!;
    }
    const logicalAdId = patch.logicalAdId ?? createId();
    return adsRepo.insert({
      logicalAdId,
      platform,
      platformAdId,
      title: patch.title ?? '',
      description: patch.description ?? '',
      priceCents: patch.priceCents ?? null,
      currency: patch.currency ?? 'CAD',
      category: patch.category ?? null,
      status: patch.status ?? 'active',
      url: patch.url ?? null,
      views: patch.views ?? null,
      postedAt: patch.postedAt ?? Date.now(),
      lastRenewedAt: patch.lastRenewedAt ?? null,
      lastScrapedAt: patch.lastScrapedAt ?? Date.now(),
      snoozedUntil: patch.snoozedUntil ?? null,
      notes: patch.notes ?? null,
    });
  },

  update(id: string, patch: Partial<Omit<Ad, 'id' | 'createdAt'>>): void {
    const allowed: Array<[keyof Ad, string]> = [
      ['logicalAdId', 'logical_ad_id'],
      ['platform', 'platform'],
      ['platformAdId', 'platform_ad_id'],
      ['title', 'title'],
      ['description', 'description'],
      ['priceCents', 'price_cents'],
      ['currency', 'currency'],
      ['category', 'category'],
      ['status', 'status'],
      ['url', 'url'],
      ['views', 'views'],
      ['postedAt', 'posted_at'],
      ['lastRenewedAt', 'last_renewed_at'],
      ['lastScrapedAt', 'last_scraped_at'],
      ['snoozedUntil', 'snoozed_until'],
      ['notes', 'notes'],
    ];
    const sets: string[] = [];
    const params: Record<string, unknown> = { id, updated_at: Date.now() };
    for (const [k, col] of allowed) {
      // Skip undefined (caller didn't provide it) but DO allow null (caller wants to clear it).
      const value = (patch as Record<string, unknown>)[k as string];
      if (value === undefined) continue;
      sets.push(`${col} = @${col}`);
      params[col] = value;
    }
    if (sets.length === 0) return;
    sets.push('updated_at = @updated_at');
    getDb().prepare(`UPDATE ads SET ${sets.join(', ')} WHERE id = @id`).run(params);
  },

  findById(id: string): Ad | null {
    const row = getDb().prepare('SELECT * FROM ads WHERE id = ?').get(id) as AdRow | undefined;
    return row ? rowToAd(row) : null;
  },

  findByPlatformAdId(platform: PlatformId, platformAdId: string): Ad | null {
    const row = getDb()
      .prepare('SELECT * FROM ads WHERE platform = ? AND platform_ad_id = ?')
      .get(platform, platformAdId) as AdRow | undefined;
    return row ? rowToAd(row) : null;
  },

  findActiveByPlatform(platform: PlatformId): Ad[] {
    const rows = getDb()
      .prepare("SELECT * FROM ads WHERE platform = ? AND status = 'active' ORDER BY posted_at DESC")
      .all(platform) as AdRow[];
    return rows.map(rowToAd);
  },

  findByLogicalId(logicalAdId: string): Ad[] {
    const rows = getDb()
      .prepare('SELECT * FROM ads WHERE logical_ad_id = ? ORDER BY created_at DESC')
      .all(logicalAdId) as AdRow[];
    return rows.map(rowToAd);
  },

  markStatus(id: string, status: AdStatus): void {
    getDb().prepare('UPDATE ads SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id);
  },

  setSnooze(id: string, snoozedUntil: number | null): void {
    getDb()
      .prepare('UPDATE ads SET snoozed_until = ?, updated_at = ? WHERE id = ?')
      .run(snoozedUntil, Date.now(), id);
  },

  setNotes(id: string, notes: string | null): void {
    getDb()
      .prepare('UPDATE ads SET notes = ?, updated_at = ? WHERE id = ?')
      .run(notes && notes.trim() ? notes : null, Date.now(), id);
  },

  markStatusByPlatformId(platform: PlatformId, platformAdId: string, status: AdStatus): void {
    getDb()
      .prepare('UPDATE ads SET status = ?, updated_at = ? WHERE platform = ? AND platform_ad_id = ?')
      .run(status, Date.now(), platform, platformAdId);
  },

  listForDashboard(filter: AdFilter): AdView[] {
    const where: string[] = [];
    const params: Record<string, unknown> = {};

    if (filter.platforms && filter.platforms.length > 0) {
      where.push(`a.platform IN (${filter.platforms.map((_, i) => `@p${i}`).join(',')})`);
      filter.platforms.forEach((p, i) => (params[`p${i}`] = p));
    }
    if (filter.status && filter.status.length > 0) {
      where.push(`a.status IN (${filter.status.map((_, i) => `@s${i}`).join(',')})`);
      filter.status.forEach((s, i) => (params[`s${i}`] = s));
    }
    if (filter.search) {
      where.push('(a.title LIKE @search OR a.description LIKE @search)');
      params.search = `%${filter.search}%`;
    }
    if (filter.minAgeDays != null) {
      where.push('(strftime(\'%s\',\'now\') * 1000 - a.posted_at) / 86400000 >= @minAge');
      params.minAge = filter.minAgeDays;
    }
    if (filter.maxAgeDays != null) {
      where.push('(strftime(\'%s\',\'now\') * 1000 - a.posted_at) / 86400000 <= @maxAge');
      params.maxAge = filter.maxAgeDays;
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT a.*,
             CAST((strftime('%s','now') * 1000 - a.posted_at) / 86400000 AS INTEGER) AS age_days,
             (SELECT COUNT(*) FROM ad_photos p WHERE p.ad_id = a.id) AS photo_count,
             (SELECT photo_hash FROM ad_photos p WHERE p.ad_id = a.id ORDER BY order_index LIMIT 1) AS thumb_hash
      FROM ads a
      ${whereSql}
      ORDER BY a.posted_at ASC
    `;
    const rows = getDb().prepare(sql).all(params) as (AdRow & {
      age_days: number;
      photo_count: number;
      thumb_hash: string | null;
    })[];

    return rows.map((r) => {
      const ad = rowToAd(r);
      const siblings = getDb()
        .prepare("SELECT DISTINCT platform FROM ads WHERE logical_ad_id = ? AND id != ? AND status = 'active'")
        .all(r.logical_ad_id, r.id) as Array<{ platform: string }>;
      const lastAction = getDb()
        .prepare(
          'SELECT action, timestamp, success FROM repost_history WHERE logical_ad_id = ? AND platform = ? AND action != ? ORDER BY timestamp DESC LIMIT 1',
        )
        .get(r.logical_ad_id, r.platform, 'scan') as { action: string; timestamp: number; success: number } | undefined;
      return {
        ...ad,
        ageDays: r.age_days,
        photoCount: r.photo_count,
        thumbHash: r.thumb_hash,
        thumbPath: null,
        siblingPlatforms: siblings.map((s) => s.platform as PlatformId),
        lastActionLabel: lastAction ? `${lastAction.action}${lastAction.success ? '' : ' (failed)'}` : null,
        lastActionAt: lastAction?.timestamp ?? null,
      } satisfies AdView;
    });
  },
};
