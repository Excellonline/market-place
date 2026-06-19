import type { IpcMain } from 'electron';
import fs from 'node:fs';
import { IPC } from '@shared/types/ipc';
import type { PlatformId } from '@shared/types/platform';
import { platformQueue } from '../scheduler/queue';
import { getAdapter } from '../platforms/registry';
import { paths } from '../paths';
import { logger } from '../logger';
import type { BrowserSession } from '../platforms/BrowserSession';
import { settingsRepo } from '../db/repos';

interface LoginSlot {
  session: BrowserSession | null;
  expiresAt: number;
}
const loginSlots = new Map<PlatformId, LoginSlot>();

function clearSlot(p: PlatformId) {
  const s = loginSlots.get(p);
  if (s?.session) void s.session.close().catch(() => undefined);
  loginSlots.delete(p);
}

export function registerPlatformsIpc(ipc: IpcMain) {
  ipc.handle(IPC.PlatformHealth, async () => {
    return platformQueue.health();
  });

  ipc.handle(IPC.PlatformStartLogin, async (_e, platform: PlatformId) => {
    // Launch a visible browser for the user to authenticate. We hold the session open
    // until confirmLoggedIn or 10 minutes.
    return platformQueue.enqueueRaw(platform, async () => {
      clearSlot(platform);
      try {
        // Close any active automation session for this platform so we can launch interactively.
        await platformQueue.closeSession(platform);
        const adapter = getAdapter(platform);
        const { session } = await adapter.interactiveLogin();
        loginSlots.set(platform, { session, expiresAt: Date.now() + 10 * 60 * 1000 });
        return { ok: true };
      } catch (err) {
        logger().error({ err, platform }, 'interactiveLogin failed');
        return { ok: false };
      }
    });
  });

  ipc.handle(IPC.PlatformConfirmLogin, async (_e, platform: PlatformId) => {
    const slot = loginSlots.get(platform);
    if (!slot?.session) return { ok: false, loggedIn: false };
    try {
      const adapter = getAdapter(platform);
      const loggedIn = await adapter.isLoggedIn(slot.session);
      if (loggedIn) {
        // Close the interactive session — the next attachSession will reuse the persisted profile.
        await slot.session.close();
        loginSlots.delete(platform);
        platformQueue.updateHealth(platform, { loggedIn: true, status: 'healthy' });
      }
      return { ok: true, loggedIn };
    } catch (err) {
      logger().warn({ err, platform }, 'confirmLoggedIn check failed');
      return { ok: false, loggedIn: false };
    }
  });

  ipc.handle(IPC.PlatformResolve, async (_e, platform: PlatformId) => {
    platformQueue.updateHealth(platform, { status: 'unknown', lastErrorMessage: null });
    return { ok: true };
  });

  ipc.handle(IPC.PlatformPause, async (_e, payload: { platform: PlatformId; until: number | null }) => {
    settingsRepo.set(`paused_until.${payload.platform}`, payload.until);
    return { ok: true };
  });

  ipc.handle(IPC.PlatformReset, async (_e, platform: PlatformId) => {
    await platformQueue.closeSession(platform);
    const dir = paths.profileFor(platform);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      logger().warn({ err, dir }, 'failed to remove profile dir');
    }
    platformQueue.updateHealth(platform, {
      status: 'logged_out',
      loggedIn: false,
      lastErrorMessage: null,
      lastErrorScreenshot: null,
    });
    return { ok: true };
  });
}
