import { dialog, type IpcMain } from 'electron';
import fs from 'node:fs';
import { IPC } from '@shared/types/ipc';
import { importLocalFile, readPhotoBytes, storeBytes } from '../photos/store';
import { getThumbBytes } from '../photos/thumbnails';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function registerPhotosIpc(ipc: IpcMain) {
  ipc.handle(IPC.PhotosImport, async () => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (r.canceled) return { hashes: [] };
    const hashes: string[] = [];
    for (const p of r.filePaths) {
      if (!fs.existsSync(p)) continue;
      const { hash } = importLocalFile(p);
      hashes.push(hash);
    }
    return { hashes };
  });

  ipc.handle(IPC.PhotosGetData, async (_e, hash: string) => {
    const r = readPhotoBytes(hash);
    if (!r) return null;
    const mime = MIME_BY_EXT[r.ext] ?? 'application/octet-stream';
    return `data:${mime};base64,${r.buf.toString('base64')}`;
  });

  ipc.handle(IPC.PhotosGetThumb, async (_e, hash: string) => {
    const buf = await getThumbBytes(hash);
    if (!buf) return null;
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  });

  ipc.handle(IPC.PhotosStoreBytes, async (_e, bytes: ArrayBuffer) => {
    if (!bytes || bytes.byteLength === 0) return null;
    if (bytes.byteLength > 20 * 1024 * 1024) return null;          // 20MB cap
    const buf = Buffer.from(bytes);
    const r = storeBytes(buf);
    return { hash: r.hash };
  });
}
