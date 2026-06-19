import { shell, type IpcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { IPC } from '@shared/types/ipc';
import { paths } from '../paths';
import { backupUserData } from '../backup';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** Only allow reading files inside userData — never let the renderer probe the wider FS. */
function isInsideUserData(absolute: string): boolean {
  const userData = path.resolve(paths.userData);
  const target = path.resolve(absolute);
  const rel = path.relative(userData, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function registerShellIpc(ipc: IpcMain) {
  ipc.handle(IPC.ShellOpenUserData, async () => {
    await shell.openPath(paths.userData);
  });

  ipc.handle(IPC.ShellRevealPath, async (_e, filePath: string) => {
    if (!filePath || !isInsideUserData(filePath)) return;
    if (!fs.existsSync(filePath)) return;
    shell.showItemInFolder(path.resolve(filePath));
  });

  ipc.handle(IPC.DataBackup, async () => backupUserData());

  ipc.handle(IPC.DataReadFileAsDataUrl, async (_e, filePath: string) => {
    if (!filePath || !isInsideUserData(filePath)) return null;
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) return null;
    const stat = fs.statSync(filePath);
    if (stat.size > 10 * 1024 * 1024) return null; // 10MB cap
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString('base64')}`;
  });
}
