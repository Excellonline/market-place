import type { IpcMain } from 'electron';
import { IPC } from '@shared/types/ipc';
import { settingsRepo } from '../db/repos';
import { scheduler } from '../scheduler';

export function registerSettingsIpc(ipc: IpcMain) {
  ipc.handle(IPC.SettingsGet, async () => settingsRepo.all());

  ipc.handle(IPC.SettingsSet, async (_e, payload: { key: string; value: unknown }) => {
    settingsRepo.set(payload.key, payload.value);
    if (payload.key === 'scan_cron') {
      scheduler.installCron();
    }
  });
}
