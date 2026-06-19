import type { PlatformId, PlatformHealth } from '@shared/types/platform';
import type { BrowserSession } from '../platforms/BrowserSession';
import { getAdapter } from '../platforms/registry';
import { logger } from '../logger';
import { HumanInterventionRequired, RateLimitedError, SelectorBrokenError, SessionExpired } from '../platforms/errors';

const IDLE_CLOSE_MS = 5 * 60 * 1000;

interface PlatformState {
  chain: Promise<unknown>;
  session: BrowserSession | null;
  sessionAcquiredAt: number;
  idleTimer: NodeJS.Timeout | null;
  health: PlatformHealth;
}

function defaultHealth(p: PlatformId): PlatformHealth {
  return {
    platform: p,
    status: 'unknown',
    loggedIn: false,
    lastScanAt: null,
    lastScanSucceeded: false,
    lastErrorMessage: null,
    lastErrorScreenshot: null,
    rateLimitedUntil: null,
  };
}

type HealthListener = (h: PlatformHealth) => void;

class PlatformQueueImpl {
  private states = new Map<PlatformId, PlatformState>();
  private listeners = new Set<HealthListener>();

  /** Pre-create state for known platforms so health() always returns them. */
  init(platforms: PlatformId[]): void {
    for (const p of platforms) this.getState(p);
  }

  private getState(p: PlatformId): PlatformState {
    let s = this.states.get(p);
    if (!s) {
      s = {
        chain: Promise.resolve(),
        session: null,
        sessionAcquiredAt: 0,
        idleTimer: null,
        health: defaultHealth(p),
      };
      this.states.set(p, s);
    }
    return s;
  }

  onHealthChange(fn: HealthListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  health(platform?: PlatformId): PlatformHealth[] {
    if (platform) return [this.getState(platform).health];
    return Array.from(this.states.values()).map((s) => s.health);
  }

  updateHealth(platform: PlatformId, patch: Partial<PlatformHealth>): PlatformHealth {
    const s = this.getState(platform);
    s.health = { ...s.health, ...patch, platform };
    for (const l of this.listeners) l(s.health);
    return s.health;
  }

  /**
   * Enqueue a task that needs a logged-in session for the platform.
   * Tasks for the same platform run strictly sequentially.
   */
  enqueue<T>(platform: PlatformId, task: (session: BrowserSession) => Promise<T>): Promise<T> {
    const s = this.getState(platform);
    const next = s.chain.catch(() => undefined).then(() => this.runWithSession(platform, task));
    s.chain = next.catch(() => undefined);
    return next;
  }

  /**
   * Variant that doesn't try to attach a session — for interactive login where we want to open
   * the browser even if not yet authenticated.
   */
  enqueueRaw<T>(platform: PlatformId, task: () => Promise<T>): Promise<T> {
    const s = this.getState(platform);
    const next = s.chain.catch(() => undefined).then(task);
    s.chain = next.catch(() => undefined);
    return next;
  }

  private async runWithSession<T>(platform: PlatformId, task: (session: BrowserSession) => Promise<T>): Promise<T> {
    const adapter = getAdapter(platform);
    const s = this.getState(platform);

    if (s.idleTimer) {
      clearTimeout(s.idleTimer);
      s.idleTimer = null;
    }

    if (!s.session) {
      logger().debug({ platform }, 'attaching session');
      s.session = await adapter.attachSession();
      s.sessionAcquiredAt = Date.now();
    }

    try {
      const result = await task(s.session);
      this.scheduleIdleClose(platform);
      return result;
    } catch (err) {
      await this.handleTaskError(platform, err);
      throw err;
    }
  }

  private scheduleIdleClose(platform: PlatformId): void {
    const s = this.getState(platform);
    if (s.idleTimer) clearTimeout(s.idleTimer);
    s.idleTimer = setTimeout(() => {
      void this.closeSession(platform).catch(() => undefined);
    }, IDLE_CLOSE_MS);
  }

  async closeSession(platform: PlatformId): Promise<void> {
    const s = this.states.get(platform);
    if (!s || !s.session) return;
    logger().debug({ platform }, 'closing idle session');
    const sess = s.session;
    s.session = null;
    if (s.idleTimer) {
      clearTimeout(s.idleTimer);
      s.idleTimer = null;
    }
    await sess.close().catch(() => undefined);
  }

  async closeAll(): Promise<void> {
    await Promise.all(Array.from(this.states.keys()).map((p) => this.closeSession(p)));
  }

  private async handleTaskError(platform: PlatformId, err: unknown): Promise<void> {
    if (err instanceof SessionExpired) {
      this.updateHealth(platform, { status: 'logged_out', loggedIn: false, lastErrorMessage: err.message });
      await this.closeSession(platform);
    } else if (err instanceof HumanInterventionRequired) {
      this.updateHealth(platform, {
        status: 'paused',
        lastErrorMessage: err.message,
        lastErrorScreenshot: err.screenshotPath,
      });
    } else if (err instanceof RateLimitedError) {
      this.updateHealth(platform, {
        status: 'rate_limited',
        rateLimitedUntil: err.resetAt,
        lastErrorMessage: err.message,
      });
    } else if (err instanceof SelectorBrokenError) {
      this.updateHealth(platform, {
        status: 'broken',
        lastErrorMessage: err.message,
        lastErrorScreenshot: err.screenshotPath,
      });
    } else if (err instanceof Error) {
      this.updateHealth(platform, { lastErrorMessage: err.message });
    }
  }
}

export const platformQueue = new PlatformQueueImpl();
