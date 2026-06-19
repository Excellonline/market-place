import cron from 'node-cron';
import type { BrowserWindow } from 'electron';
import { settingsRepo, historyRepo } from '../db/repos';
import { platformQueue } from './queue';
import { allAdapters } from '../platforms/registry';
import { logger } from '../logger';
import { adsRepo } from '../db/repos/ads.repo';
import { IPC_EVENTS, type NotificationPayload, type ScanCompletePayload, type ScanProgressPayload } from '@shared/types/ipc';
import type { PlatformId } from '@shared/types/platform';
import { PLATFORM_DISPLAY_NAMES } from '@shared/types/platform';
import { fetchPhoto } from '../platforms/photoFetcher';
import { photosRepo } from '../db/repos/photos.repo';
import { notify } from '../notifications';
import { getAdapter } from '../platforms/registry';
import { SessionExpired } from '../platforms/errors';
import { nextCronTime } from './cron-next';

const SCAN_KEY = 'last_successful_scan';

type WindowGetter = () => BrowserWindow | null;

class SchedulerImpl {
  private task: cron.ScheduledTask | null = null;
  private getWindow: WindowGetter | null = null;
  private startupTickTimer: NodeJS.Timeout | null = null;

  start(getWindow: WindowGetter): void {
    this.getWindow = getWindow;
    platformQueue.init(allAdapters().map((a) => a.id));
    this.installCron();
    platformQueue.onHealthChange((h) => {
      this.send(IPC_EVENTS.PlatformHealthChanged, h);
    });

    // Fast, lightweight per-platform probe ~3s after start: confirms session state without scanning.
    // This avoids the "unknown" health chips on first open.
    setTimeout(() => {
      void this.probeAllPlatforms().catch((err) => logger().warn({ err }, 'startup probe failed'));
    }, 3000);

    // Catch-up tick if last successful scan > 24h ago (and not paused)
    const last = settingsRepo.get<number>(SCAN_KEY, 0) ?? 0;
    if (Date.now() - last > 24 * 3600 * 1000) {
      this.startupTickTimer = setTimeout(() => {
        if (settingsRepo.get<boolean>('scans_paused') === true) {
          logger().info('startup catch-up scan skipped — paused');
          return;
        }
        void this.scanAll().catch((err) => logger().warn({ err }, 'startup catch-up scan failed'));
      }, 8000);
    }
  }

  stop(): void {
    this.task?.stop();
    this.task = null;
    if (this.startupTickTimer) {
      clearTimeout(this.startupTickTimer);
      this.startupTickTimer = null;
    }
    void platformQueue.closeAll().catch(() => undefined);
  }

  installCron(): void {
    const expr = String(settingsRepo.get<string>('scan_cron') ?? '0 9 * * *');
    this.task?.stop();
    this.task = cron.schedule(expr, () => {
      if (settingsRepo.get<boolean>('scans_paused') === true) {
        logger().info('scheduled scan skipped — paused');
        return;
      }
      void this.scanAll().catch((err) => logger().warn({ err }, 'scheduled scan failed'));
    });
    logger().info({ expr }, 'scheduler installed');
  }

  send(channel: string, payload: unknown): void {
    const w = this.getWindow?.();
    w?.webContents.send(channel, payload);
  }

  async scanAll(): Promise<void> {
    await Promise.all(
      allAdapters().map((a) => {
        if (this.isPlatformPaused(a.id)) {
          logger().info({ platform: a.id }, 'scan skipped — platform paused');
          return Promise.resolve();
        }
        return this.scanPlatform(a.id).catch(() => undefined);
      }),
    );
    settingsRepo.set(SCAN_KEY, Date.now());
  }

  isPlatformPaused(platform: PlatformId): boolean {
    const until = settingsRepo.get<number | null>(`paused_until.${platform}`);
    return !!until && until > Date.now();
  }

  /** Next cron fire time as unix ms, or null if no task scheduled. */
  nextRunAt(): number | null {
    if (!this.task) return null;
    // node-cron 4.x doesn't expose getNextRun publicly; we estimate from the expression by parsing
    // ourselves. Cheap approach: store the last installed expr and reproduce a one-shot calculation.
    const expr = String(settingsRepo.get<string>('scan_cron') ?? '0 9 * * *');
    return nextCronTime(expr);
  }

  async probeAllPlatforms(): Promise<void> {
    await Promise.all(allAdapters().map((a) => this.probePlatform(a.id).catch(() => undefined)));
  }

  async probePlatform(platform: PlatformId): Promise<void> {
    return platformQueue.enqueueRaw(platform, async () => {
      const adapter = getAdapter(platform);
      let session;
      try {
        session = await adapter.attachSession();
      } catch (err) {
        if (err instanceof SessionExpired) {
          platformQueue.updateHealth(platform, { status: 'logged_out', loggedIn: false });
          return;
        }
        logger().warn({ err, platform }, 'probe attachSession failed');
        platformQueue.updateHealth(platform, { lastErrorMessage: err instanceof Error ? err.message : String(err) });
        return;
      }
      try {
        const h = await adapter.healthCheck(session);
        platformQueue.updateHealth(platform, h);
      } catch (err) {
        logger().warn({ err, platform }, 'probe healthCheck failed');
      } finally {
        await session.close().catch(() => undefined);
      }
    });
  }

  async scanPlatform(platform: PlatformId): Promise<void> {
    if (this.isPlatformPaused(platform)) {
      logger().info({ platform }, 'scanPlatform skipped — platform paused');
      return;
    }
    return platformQueue.enqueue(platform, async (session) => {
      const adapter = allAdapters().find((a) => a.id === platform)!;
      this.send(IPC_EVENTS.ScanProgress, { platform, step: 'list', current: 0, total: 0 } satisfies ScanProgressPayload);
      let succeeded = false;
      let errorMessage: string | null = null;
      try {
        const scraped = await adapter.listMyAds(session);
        this.send(IPC_EVENTS.ScanProgress, { platform, step: 'enrich', current: 0, total: scraped.length } satisfies ScanProgressPayload);

        let i = 0;
        for (const s of scraped) {
          const existing = adsRepo.findByPlatformAdId(platform, s.platformAdId);
          const logicalAdId = existing?.logicalAdId;
          const saved = adsRepo.upsertByPlatformId(platform, s.platformAdId, {
            logicalAdId,
            title: s.title,
            description: s.description,
            priceCents: s.priceCents,
            currency: s.currency,
            category: s.category,
            status: s.status,
            url: s.url,
            views: s.views,
            postedAt: s.postedAt,
            lastScrapedAt: Date.now(),
          });

          // Only fetch photos on first sight of an ad (we keep the originals locally).
          if (!existing && s.photoUrls.length > 0) {
            const hashes: Array<{ hash: string; originalUrl: string }> = [];
            for (const url of s.photoUrls.slice(0, 10)) {
              const r = await fetchPhoto(session.page, url);
              if (r) hashes.push({ hash: r.hash, originalUrl: url });
            }
            if (hashes.length > 0) photosRepo.setForAd(saved.id, hashes);
          }

          historyRepo.record({
            logicalAdId: saved.logicalAdId,
            platform,
            action: 'scan',
            success: true,
            errorCode: null,
            errorMessage: null,
            beforeAdId: null,
            afterAdId: null,
          });

          i++;
          this.send(IPC_EVENTS.ScanProgress, {
            platform,
            step: 'enrich',
            current: i,
            total: scraped.length,
          } satisfies ScanProgressPayload);
        }
        succeeded = true;
        platformQueue.updateHealth(platform, {
          status: 'healthy',
          loggedIn: true,
          lastScanAt: Date.now(),
          lastScanSucceeded: true,
          lastErrorMessage: null,
        });
        this.notifyAgingAds(platform);
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        platformQueue.updateHealth(platform, {
          lastScanAt: Date.now(),
          lastScanSucceeded: false,
          lastErrorMessage: errorMessage,
        });
        logger().error({ err, platform }, 'scan failed');
        this.notifyScanError(platform, errorMessage);
      } finally {
        if (succeeded && settingsRepo.get<boolean>('notify.scan_complete') === true) {
          this.emitNotification({
            title: `${PLATFORM_DISPLAY_NAMES[platform]} scan complete`,
            body: `Scanned successfully at ${new Date().toLocaleTimeString()}`,
            platform,
            level: 'info',
          });
        }
        this.send(IPC_EVENTS.ScanComplete, {
          platform,
          scanned: -1,
          succeeded,
          errorMessage,
        } satisfies ScanCompletePayload);
      }
    });
  }

  private notifyAgingAds(platform: PlatformId): void {
    if (settingsRepo.get<boolean>('notify.aging') !== true) return;
    const threshold = Number(settingsRepo.get(`age_threshold_days.${platform}`) ?? 7);
    const active = adsRepo.findActiveByPlatform(platform);
    const now = Date.now();
    const aging = active
      .filter(
        (a) =>
          (now - a.postedAt) / 86400_000 >= threshold &&
          !(a.snoozedUntil && a.snoozedUntil > now),
      )
      .sort((a, b) => a.postedAt - b.postedAt); // oldest first
    if (aging.length === 0) return;
    const oldest = aging[0]!;
    const oldestDays = Math.floor((now - oldest.postedAt) / 86400_000);
    this.emitNotification({
      title: `${aging.length} aging ad${aging.length === 1 ? '' : 's'} on ${PLATFORM_DISPLAY_NAMES[platform]}`,
      body:
        aging.length === 1
          ? `"${oldest.title}" is ${oldestDays} days old`
          : `Oldest: "${oldest.title}" (${oldestDays} days)`,
      platform,
      level: 'warn',
    });
  }

  private notifyScanError(platform: PlatformId, message: string): void {
    if (settingsRepo.get<boolean>('notify.errors') !== true) return;
    const isCaptcha = /human|captcha|checkpoint|confirm it/i.test(message);
    if (isCaptcha && settingsRepo.get<boolean>('notify.captcha') !== true) return;
    if (!isCaptcha && settingsRepo.get<boolean>('notify.errors') !== true) return;
    this.emitNotification({
      title: `${PLATFORM_DISPLAY_NAMES[platform]} ${isCaptcha ? 'needs attention' : 'scan failed'}`,
      body: message.slice(0, 200),
      platform,
      level: isCaptcha ? 'warn' : 'error',
    });
  }

  private emitNotification(payload: NotificationPayload): void {
    notify(payload);
    this.send(IPC_EVENTS.Notification, payload);
  }
}

export const scheduler = new SchedulerImpl();
