import fs from 'node:fs';
import path from 'node:path';
import { dialog } from 'electron';
import archiver from 'archiver';
import { paths } from './paths';
import { logger } from './logger';

/**
 * Bundle the user data folder into a zip. Excludes the Playwright `profiles/` folder
 * because it contains live session cookies — restoring that to a different machine
 * is a security risk and won't reliably restore the session anyway.
 */
export async function backupUserData(): Promise<{ ok: boolean; path?: string; sizeBytes?: number; message?: string }> {
  const r = await dialog.showSaveDialog({
    title: 'Backup user data',
    defaultPath: `marketplace-backup-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`,
    filters: [{ name: 'Zip', extensions: ['zip'] }],
  });
  if (r.canceled || !r.filePath) return { ok: false };

  return new Promise((resolve) => {
    const output = fs.createWriteStream(r.filePath!);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => {
      logger().info({ size: archive.pointer(), path: r.filePath }, 'backup written');
      resolve({ ok: true, path: r.filePath, sizeBytes: archive.pointer() });
    });
    output.on('error', (err) => resolve({ ok: false, message: err.message }));
    archive.on('error', (err) => resolve({ ok: false, message: err.message }));
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') return; // missing optional dir, ignore
      logger().warn({ err }, 'archive warning');
    });

    archive.pipe(output);

    // DB
    if (fs.existsSync(paths.db)) {
      archive.file(paths.db, { name: 'marketplace.db' });
    }
    // photos/ (originals + thumbs)
    if (fs.existsSync(paths.photos)) {
      archive.directory(paths.photos, 'photos');
    }
    // logs/ (small text files; useful for diagnosing past issues from a restore)
    if (fs.existsSync(paths.logs)) {
      archive.directory(paths.logs, 'logs');
    }
    // README-style note so the receiver knows what's in here
    archive.append(
      `marketplace-tool backup\n\n` +
        `Created: ${new Date().toISOString()}\n` +
        `Contents:\n` +
        `  marketplace.db   - SQLite database (ads, drafts, history, settings)\n` +
        `  photos/          - content-addressed photo store + thumbnails\n` +
        `  logs/            - pino log files + failure screenshots\n\n` +
        `Excluded (intentional):\n` +
        `  profiles/        - Playwright browser profiles with live session cookies.\n` +
        `                     Restore by re-logging-in via Settings on the target machine.\n`,
      { name: 'README.txt' },
    );

    void archive.finalize();
  });
}

/** Reveal a file in the OS file manager (Windows: Explorer with file selected). */
export function revealInFolder(filePath: string): void {
  if (!filePath) return;
  // shell.showItemInFolder is the right API but importing electron at module top is fine in main.
  // Lazy require to avoid pulling in electron in unrelated test contexts.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { shell } = require('electron') as typeof import('electron');
  void shell.showItemInFolder(path.resolve(filePath));
}
