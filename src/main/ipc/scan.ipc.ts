import type { IpcMain } from 'electron';
import { IPC } from '@shared/types/ipc';
import { PLATFORM_IDS, type PlatformId } from '@shared/types/platform';
import { scheduler } from '../scheduler';
import { settingsRepo } from '../db/repos';

export function registerScanIpc(ipc: IpcMain) {
  ipc.handle(IPC.ScanAll, async () => {
    void scheduler.scanAll();
    return { ok: true };
  });

  ipc.handle(IPC.ScanPlatform, async (_e, platform: PlatformId) => {
    void scheduler.scanPlatform(platform);
    return { ok: true };
  });

  ipc.handle(IPC.ScanCancel, async () => {
    // We don't currently interrupt an in-flight scan — Playwright operations finish naturally.
    // Surface this honestly rather than pretending.
    return { ok: false };
  });

  ipc.handle(IPC.ScheduleInfo, async () => {
    const cron = String(settingsRepo.get('scan_cron') ?? '0 9 * * *');
    const scansPaused = settingsRepo.get<boolean>('scans_paused') === true;
    const nextRunAt = scansPaused ? null : scheduler.nextRunAt();
    const platforms: Record<string, { pausedUntil: number | null }> = {};
    for (const p of PLATFORM_IDS) {
      platforms[p] = { pausedUntil: settingsRepo.get<number | null>(`paused_until.${p}`) ?? null };
    }
    return { cron, scansPaused, nextRunAt, platforms };
  });
}
