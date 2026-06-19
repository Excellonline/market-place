import { getDb } from '../index';
import { createId } from '../../ids';
import type { RepostAction, RepostHistoryEntry } from '@shared/types/ad';
import type { PlatformId } from '@shared/types/platform';

interface HistoryRow {
  id: string;
  logical_ad_id: string;
  platform: string;
  action: string;
  success: number;
  error_code: string | null;
  error_message: string | null;
  before_ad_id: string | null;
  after_ad_id: string | null;
  timestamp: number;
}

function rowToEntry(r: HistoryRow): RepostHistoryEntry {
  return {
    id: r.id,
    logicalAdId: r.logical_ad_id,
    platform: r.platform as PlatformId,
    action: r.action as RepostAction,
    success: !!r.success,
    errorCode: r.error_code,
    errorMessage: r.error_message,
    beforeAdId: r.before_ad_id,
    afterAdId: r.after_ad_id,
    timestamp: r.timestamp,
  };
}

export const historyRepo = {
  record(entry: Omit<RepostHistoryEntry, 'id' | 'timestamp'>): RepostHistoryEntry {
    const id = createId();
    const timestamp = Date.now();
    getDb()
      .prepare(
        `INSERT INTO repost_history (id, logical_ad_id, platform, action, success, error_code, error_message,
                                      before_ad_id, after_ad_id, timestamp)
         VALUES (@id, @logical_ad_id, @platform, @action, @success, @error_code, @error_message,
                 @before_ad_id, @after_ad_id, @timestamp)`,
      )
      .run({
        id,
        logical_ad_id: entry.logicalAdId,
        platform: entry.platform,
        action: entry.action,
        success: entry.success ? 1 : 0,
        error_code: entry.errorCode,
        error_message: entry.errorMessage,
        before_ad_id: entry.beforeAdId,
        after_ad_id: entry.afterAdId,
        timestamp,
      });
    return { ...entry, id, timestamp };
  },

  forLogical(logicalAdId: string): RepostHistoryEntry[] {
    const rows = getDb()
      .prepare('SELECT * FROM repost_history WHERE logical_ad_id = ? ORDER BY timestamp DESC')
      .all(logicalAdId) as HistoryRow[];
    return rows.map(rowToEntry);
  },

  /** Number of NON-scan actions for this platform since unix-ms `since`. */
  countActions(platform: PlatformId, since: number): number {
    const row = getDb()
      .prepare(
        "SELECT COUNT(*) AS c FROM repost_history WHERE platform = ? AND timestamp >= ? AND action != 'scan'",
      )
      .get(platform, since) as { c: number };
    return row.c;
  },

  /** Last successful non-scan timestamp for this logical ad, or null. */
  lastActionAt(logicalAdId: string): number | null {
    const row = getDb()
      .prepare(
        "SELECT MAX(timestamp) AS t FROM repost_history WHERE logical_ad_id = ? AND action != 'scan' AND success = 1",
      )
      .get(logicalAdId) as { t: number | null };
    return row.t ?? null;
  },

  recentFailures(limit = 30): RepostHistoryEntry[] {
    const rows = getDb()
      .prepare('SELECT * FROM repost_history WHERE success = 0 ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as HistoryRow[];
    return rows.map(rowToEntry);
  },

  recent(opts: { limit?: number; platform?: PlatformId; actions?: string[]; onlyFailures?: boolean } = {}): RepostHistoryEntry[] {
    const where: string[] = [];
    const params: Record<string, unknown> = { limit: opts.limit ?? 100 };
    if (opts.platform) {
      where.push('platform = @platform');
      params.platform = opts.platform;
    }
    if (opts.actions && opts.actions.length > 0) {
      where.push(`action IN (${opts.actions.map((_, i) => `@a${i}`).join(',')})`);
      opts.actions.forEach((a, i) => (params[`a${i}`] = a));
    }
    if (opts.onlyFailures) where.push('success = 0');
    const sql = `SELECT * FROM repost_history ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY timestamp DESC LIMIT @limit`;
    const rows = getDb().prepare(sql).all(params) as HistoryRow[];
    return rows.map(rowToEntry);
  },

  /** Stats since `since` (unix ms). */
  statsSince(since: number): {
    totalActions: number;
    successCount: number;
    failureCount: number;
    byAction: Record<string, number>;
  } {
    const rows = getDb()
      .prepare(
        "SELECT action, success, COUNT(*) AS c FROM repost_history WHERE timestamp >= ? AND action != 'scan' GROUP BY action, success",
      )
      .all(since) as Array<{ action: string; success: number; c: number }>;
    const byAction: Record<string, number> = {};
    let successCount = 0;
    let failureCount = 0;
    for (const r of rows) {
      byAction[r.action] = (byAction[r.action] ?? 0) + r.c;
      if (r.success) successCount += r.c;
      else failureCount += r.c;
    }
    return { totalActions: successCount + failureCount, successCount, failureCount, byAction };
  },
};
