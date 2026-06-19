import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { PlatformId } from '@shared/types/platform';

function ensureDir(p: string): string {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

let cached: ReturnType<typeof build> | null = null;

function build() {
  const userData = app.getPath('userData');
  const photosDir = path.join(userData, 'photos');
  const profilesDir = path.join(userData, 'profiles');
  const logsDir = path.join(userData, 'logs');
  ensureDir(photosDir);
  ensureDir(profilesDir);
  ensureDir(logsDir);
  return {
    userData,
    db: path.join(userData, 'marketplace.db'),
    photos: photosDir,
    profiles: profilesDir,
    logs: logsDir,
    profileFor(platform: PlatformId): string {
      return ensureDir(path.join(profilesDir, platform));
    },
    photoFile(hash: string, ext: string): string {
      const clean = ext.startsWith('.') ? ext : `.${ext}`;
      return path.join(photosDir, `${hash}${clean}`);
    },
    failureScreenshot(platform: PlatformId, step: string): string {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      return path.join(logsDir, `failure-${ts}-${platform}-${step}.png`);
    },
  };
}

export const paths = new Proxy({} as ReturnType<typeof build>, {
  get(_target, prop) {
    if (!cached) cached = build();
    return Reflect.get(cached, prop);
  },
});
