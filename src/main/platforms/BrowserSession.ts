import { chromium, type BrowserContext, type Page } from 'playwright';
import type { PlatformId } from '@shared/types/platform';
import { paths } from '../paths';
import { logger } from '../logger';

export class BrowserSession {
  constructor(
    public readonly platform: PlatformId,
    public readonly context: BrowserContext,
    public readonly page: Page,
  ) {}

  async close(): Promise<void> {
    try {
      await this.context.close();
    } catch (err) {
      logger().warn({ err, platform: this.platform }, 'error closing browser context');
    }
  }
}

export interface LaunchOptions {
  headless?: boolean;          // default false — never go headless on FB
  viewport?: { width: number; height: number } | null;
}

/** Launch a persistent Chromium context for this platform. Always headed by default. */
export async function launchPersistent(platform: PlatformId, opts: LaunchOptions = {}): Promise<BrowserSession> {
  const userDataDir = paths.profileFor(platform);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: opts.headless ?? false,
    viewport: opts.viewport ?? null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-features=Translate',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  // Reuse the first page Chromium opens, or open one.
  const existing = context.pages();
  const page = existing.length > 0 ? existing[0]! : await context.newPage();

  logger().info({ platform }, 'browser session launched');
  return new BrowserSession(platform, context, page);
}
