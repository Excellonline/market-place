import type { BrowserWindow, IpcMain } from 'electron';
import { registerAdsIpc } from './ads.ipc';
import { registerComposeIpc } from './compose.ipc';
import { registerPhotosIpc } from './photos.ipc';
import { registerPlatformsIpc } from './platforms.ipc';
import { registerScanIpc } from './scan.ipc';
import { registerSettingsIpc } from './settings.ipc';
import { registerShellIpc } from './shell.ipc';

export function registerIpc(ipc: IpcMain, _getWindow: () => BrowserWindow | null) {
  registerAdsIpc(ipc);
  registerComposeIpc(ipc);
  registerPhotosIpc(ipc);
  registerPlatformsIpc(ipc);
  registerScanIpc(ipc);
  registerSettingsIpc(ipc);
  registerShellIpc(ipc);
}
