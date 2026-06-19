import fs from 'node:fs';
import { dialog } from 'electron';
import { adsRepo, historyRepo } from './db/repos';
import { PLATFORM_DISPLAY_NAMES } from '@shared/types/platform';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const out: string[] = [headers.join(',')];
  for (const r of rows) out.push(headers.map((h) => csvEscape(r[h])).join(','));
  return out.join('\n');
}

// Prepended on disk so Excel on Windows reads our UTF-8 CSV without mojibake.
const UTF8_BOM = '﻿';

export async function exportAdsCsv(): Promise<{ ok: boolean; path?: string }> {
  const r = await dialog.showSaveDialog({
    title: 'Export ads to CSV',
    defaultPath: `marketplace-ads-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };

  const ads = adsRepo.listForDashboard({});
  const headers = [
    'id', 'logical_ad_id', 'platform', 'platform_ad_id', 'title', 'description',
    'price_cad', 'category', 'status', 'url', 'views', 'age_days',
    'posted_at', 'last_renewed_at', 'last_scraped_at', 'last_action', 'sibling_platforms',
  ];
  const rows = ads.map((a) => ({
    id: a.id,
    logical_ad_id: a.logicalAdId,
    platform: PLATFORM_DISPLAY_NAMES[a.platform],
    platform_ad_id: a.platformAdId,
    title: a.title,
    description: a.description,
    price_cad: a.priceCents == null ? '' : (a.priceCents / 100).toFixed(2),
    category: a.category,
    status: a.status,
    url: a.url,
    views: a.views,
    age_days: a.ageDays,
    posted_at: new Date(a.postedAt).toISOString(),
    last_renewed_at: a.lastRenewedAt ? new Date(a.lastRenewedAt).toISOString() : '',
    last_scraped_at: a.lastScrapedAt ? new Date(a.lastScrapedAt).toISOString() : '',
    last_action: a.lastActionLabel,
    sibling_platforms: a.siblingPlatforms.join(';'),
  }));
  fs.writeFileSync(r.filePath, UTF8_BOM + rowsToCsv(headers, rows), 'utf8');
  return { ok: true, path: r.filePath };
}

export async function exportActivityCsv(): Promise<{ ok: boolean; path?: string }> {
  const r = await dialog.showSaveDialog({
    title: 'Export activity to CSV',
    defaultPath: `marketplace-activity-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };

  const entries = historyRepo.recent({ limit: 100_000 });
  const headers = [
    'id', 'timestamp', 'platform', 'action', 'success', 'logical_ad_id',
    'before_platform_ad_id', 'after_platform_ad_id', 'error_message',
  ];
  const rows = entries.map((e) => ({
    id: e.id,
    timestamp: new Date(e.timestamp).toISOString(),
    platform: PLATFORM_DISPLAY_NAMES[e.platform],
    action: e.action,
    success: e.success ? 'true' : 'false',
    logical_ad_id: e.logicalAdId,
    before_platform_ad_id: e.beforeAdId,
    after_platform_ad_id: e.afterAdId,
    error_message: e.errorMessage,
  }));
  fs.writeFileSync(r.filePath, UTF8_BOM + rowsToCsv(headers, rows), 'utf8');
  return { ok: true, path: r.filePath };
}

