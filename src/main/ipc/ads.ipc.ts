import type { IpcMain } from 'electron';
import { IPC } from '@shared/types/ipc';
import type { AdFilter, BulkAction } from '@shared/types/ad';
import { adsRepo, historyRepo, photosRepo, settingsRepo } from '../db/repos';
import { renewAd, deleteAd, repostAd, rescanAd, retryFromHistory } from '../platforms/actions';
import { todayLocalMidnightMs } from '../platforms/humanize';
import { exportAdsCsv, exportActivityCsv } from '../export';

export function registerAdsIpc(ipc: IpcMain) {
  ipc.handle(IPC.AdsList, async (_e, filter: AdFilter) => {
    return adsRepo.listForDashboard(filter ?? {});
  });

  ipc.handle(IPC.AdsGet, async (_e, id: string) => {
    return adsRepo.findById(id);
  });

  ipc.handle(IPC.AdsRenew, async (_e, id: string) => {
    const r = await renewAd(id);
    return { ok: r.ok, message: r.message };
  });

  ipc.handle(IPC.AdsRepost, async (_e, id: string) => {
    return repostAd(id);
  });

  ipc.handle(IPC.AdsDelete, async (_e, id: string) => {
    return deleteAd(id);
  });

  ipc.handle(IPC.AdsBulk, async (_e, payload: { ids: string[]; action: BulkAction }) => {
    const results: Array<{ id: string; ok: boolean; message?: string }> = [];
    for (const id of payload.ids) {
      let r: { ok: boolean; message?: string };
      switch (payload.action) {
        case 'renew':  r = await renewAd(id); break;
        case 'delete': r = await deleteAd(id); break;
        case 'repost': r = await repostAd(id); break;
        default:       r = { ok: false, message: 'unknown action' };
      }
      results.push({ id, ...r });
    }
    return { ok: results.every((r) => r.ok), results };
  });

  ipc.handle(IPC.AdsHistory, async (_e, logicalAdId: string) => {
    return historyRepo.forLogical(logicalAdId);
  });

  ipc.handle(IPC.AdsPhotos, async (_e, adId: string) => {
    return photosRepo.findByAdId(adId).map((p) => ({ hash: p.photoHash, orderIndex: p.orderIndex }));
  });

  ipc.handle(IPC.AdsCooldown, async (_e, adId: string) => {
    const ad = adsRepo.findById(adId);
    if (!ad) return { nextAllowedAt: null, dailyCount: 0, dailyCap: 0 };
    const cooldownHours = Number(settingsRepo.get('per_ad_cooldown_hours') ?? 12);
    const lastAt = historyRepo.lastActionAt(ad.logicalAdId);
    const nextAllowedAt = lastAt ? lastAt + cooldownHours * 3600_000 : null;
    const dailyCount = historyRepo.countActions(ad.platform, todayLocalMidnightMs());
    const dailyCap = Number(settingsRepo.get(`daily_action_cap.${ad.platform}`) ?? 20);
    return { nextAllowedAt, dailyCount, dailyCap };
  });

  ipc.handle(IPC.AdsRecentFailures, async (_e, limit: number | undefined) => {
    return historyRepo.recentFailures(limit ?? 30);
  });

  ipc.handle(IPC.AdsRecentActivity, async (_e, opts: Parameters<typeof historyRepo.recent>[0] | undefined) => {
    return historyRepo.recent(opts ?? {});
  });

  ipc.handle(IPC.AdsStats, async (_e, sinceDays: number | undefined) => {
    const days = sinceDays ?? 30;
    const since = Date.now() - days * 86400_000;
    return historyRepo.statsSince(since);
  });

  ipc.handle(IPC.AdsRescanOne, async (_e, adId: string) => {
    return rescanAd(adId);
  });

  ipc.handle(IPC.AdsExportCsv, async () => exportAdsCsv());
  ipc.handle(IPC.ActivityExportCsv, async () => exportActivityCsv());

  ipc.handle(IPC.ActionsRetry, async (_e, payload: { action: string; logicalAdId: string }) => {
    return retryFromHistory(payload);
  });

  ipc.handle(IPC.AdsSnooze, async (_e, payload: { adId: string; until: number | null }) => {
    adsRepo.setSnooze(payload.adId, payload.until);
    return { ok: true };
  });

  ipc.handle(IPC.AdsSetNotes, async (_e, payload: { adId: string; notes: string | null }) => {
    adsRepo.setNotes(payload.adId, payload.notes);
    return { ok: true };
  });
}
