import type { PlatformAdapter } from '../PlatformAdapter';
import type { PlatformId, PlatformHealth } from '@shared/types/platform';
import type { AdDraft, RenewResult, ScrapedAd } from '@shared/types/ad';
import { launchPersistent, type BrowserSession } from '../BrowserSession';
import { HumanInterventionRequired, RateLimitedError, SelectorBrokenError, SessionExpired } from '../errors';
import { humanClick, humanDelay } from '../humanize';
import { logger } from '../../logger';
import { paths } from '../../paths';
import { URLS, loginIndicators, myAds, adPage, promoteModal, rateLimit, captcha, composer } from './selectors';
import { humanType } from '../humanize';
import { parseKijijiRelativeDate, parsePriceCents, escapeRegex } from './parsers';

const PLATFORM: PlatformId = 'kijiji';

async function ensureNotBlocked(session: BrowserSession, step: string): Promise<void> {
  if (await captcha.text(session.page).first().isVisible().catch(() => false)) {
    const shot = paths.failureScreenshot(PLATFORM, `${step}_captcha`);
    await session.page.screenshot({ path: shot }).catch(() => undefined);
    throw new HumanInterventionRequired(PLATFORM, 'captcha challenge', shot);
  }
  if (await rateLimit.banner(session.page).first().isVisible().catch(() => false)) {
    throw new RateLimitedError(PLATFORM, null);
  }
}

export const kijijiAdapter: PlatformAdapter = {
  id: PLATFORM,
  displayName: 'Kijiji',

  async attachSession(): Promise<BrowserSession> {
    const session = await launchPersistent(PLATFORM);
    await session.page.goto(URLS.base, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'attach');
    if (!(await this.isLoggedIn(session))) {
      await session.close();
      throw new SessionExpired(PLATFORM);
    }
    return session;
  },

  async interactiveLogin(): Promise<{ session: BrowserSession }> {
    const session = await launchPersistent(PLATFORM);
    await session.page.goto(URLS.login, { waitUntil: 'domcontentloaded' });
    return { session };
  },

  async isLoggedIn(session: BrowserSession): Promise<boolean> {
    const loginVisible = await loginIndicators.loginEmail(session.page).first().isVisible().catch(() => false);
    if (loginVisible) return false;
    const probe = await loginIndicators.loggedInProbe(session.page).first().isVisible().catch(() => false);
    return probe;
  },

  async listMyAds(session: BrowserSession): Promise<ScrapedAd[]> {
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'list');
    await humanDelay(700, 1500);

    try {
      await myAds.pageHeading(session.page).first().waitFor({ state: 'visible', timeout: 12_000 });
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'list_heading');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'list', 'myAds.pageHeading', shot);
    }

    const rows = myAds.rows(session.page);
    const count = await rows.count();
    const ads: ScrapedAd[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      try {
        const link = await myAds.titleLink(row).first().getAttribute('href');
        if (!link) continue;
        const absolute = link.startsWith('http') ? link : `${URLS.base}${link}`;
        const m = absolute.match(URLS.adIdFromUrl);
        if (!m) continue;
        const platformAdId = m[1]!;
        const title = (await myAds.titleLink(row).first().textContent())?.trim() ?? '';
        const viewsText = await myAds.viewsText(row).first().textContent().catch(() => null);
        const views = viewsText ? Number(viewsText.replace(/\D/g, '')) || null : null;
        const dateText = await myAds.postedDate(row).first().textContent().catch(() => null);
        const postedAt = dateText ? parseKijijiRelativeDate(dateText) ?? Date.now() : Date.now();

        ads.push({
          platformAdId,
          title,
          description: '',
          priceCents: null,
          currency: 'CAD',
          category: null,
          status: 'active',
          url: absolute,
          views,
          postedAt,
          photoUrls: [],
        });
      } catch (err) {
        logger().warn({ err, idx: i }, 'failed to scrape Kijiji row');
      }
    }
    return ads;
  },

  async getAd(session: BrowserSession, platformAdId: string): Promise<ScrapedAd> {
    // Kijiji doesn't expose a canonical URL by id alone — we navigate from My Ads list and find the row.
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'read');
    const linkLocator = session.page.locator(`a[href*="/${platformAdId}"]`).first();
    if (!(await linkLocator.isVisible().catch(() => false))) {
      throw new Error(`Ad ${platformAdId} not found on Kijiji My Ads`);
    }
    const href = await linkLocator.getAttribute('href');
    const url = href ? (href.startsWith('http') ? href : `${URLS.base}${href}`) : '';
    await session.page.goto(url, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'read');

    const title = (await adPage.title(session.page).first().textContent())?.trim() ?? '';
    const description = (await adPage.description(session.page).first().textContent().catch(() => null))?.trim() ?? '';
    const priceText = (await adPage.price(session.page).first().textContent().catch(() => null))?.trim() ?? null;
    const photoUrls = await session.page
      .locator('img')
      .evaluateAll((imgs) =>
        Array.from(
          new Set(
            (imgs as unknown as Array<{ src: string }>)
              .map((img) => img.src)
              .filter((src) => src.startsWith('http') && /kijiji|ebayimg|ebaystatic/i.test(src)),
          ),
        ),
      )
      .catch(() => []);

    return {
      platformAdId,
      title,
      description,
      priceCents: parsePriceCents(priceText),
      currency: 'CAD',
      category: null,
      status: 'active',
      url,
      views: null,
      postedAt: Date.now(),
      photoUrls,
    };
  },

  async renew(session: BrowserSession, platformAdId: string): Promise<RenewResult> {
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'renew');

    const row = session.page.locator(`a[href*="/${platformAdId}"]`).locator('xpath=ancestor-or-self::*[self::li or self::article or @data-testid][1]').first();
    if (!(await row.isVisible().catch(() => false))) {
      return 'not_supported';
    }
    const promote = myAds.promoteButton(row);
    if (!(await promote.first().isVisible().catch(() => false))) {
      return 'not_supported';
    }
    await humanClick(promote.first());
    await humanDelay(600, 1400);

    const free = promoteModal.freeBumpOption(session.page);
    const paid = promoteModal.paidBumpOption(session.page);
    if (await free.first().isVisible().catch(() => false)) {
      await humanClick(free.first());
      await humanDelay(800, 1600);
      return 'renewed';
    }
    if (await paid.first().isVisible().catch(() => false)) {
      // Paid bump only — back out.
      const close = promoteModal.closeButton(session.page);
      if (await close.first().isVisible().catch(() => false)) {
        await humanClick(close.first()).catch(() => undefined);
      }
      return 'not_supported';
    }
    return 'not_supported';
  },

  async delete(session: BrowserSession, platformAdId: string): Promise<void> {
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'delete');
    const row = session.page.locator(`a[href*="/${platformAdId}"]`).locator('xpath=ancestor-or-self::*[self::li or self::article or @data-testid][1]').first();
    if (!(await row.isVisible().catch(() => false))) {
      throw new Error(`Ad ${platformAdId} row not found`);
    }
    const del = myAds.deleteButton(row);
    if (!(await del.first().isVisible().catch(() => false))) {
      const shot = paths.failureScreenshot(PLATFORM, 'delete_button');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'delete', 'myAds.deleteButton', shot);
    }
    await humanClick(del.first());
    await humanDelay(500, 1100);
    const confirm = session.page.getByRole('button', { name: /^delete$|^yes|^confirm/i });
    if (await confirm.first().isVisible().catch(() => false)) {
      await humanClick(confirm.first());
    }
    await humanDelay(1200, 2400);
  },

  async create(session: BrowserSession, draft: AdDraft, photoFiles: string[]): Promise<{ platformAdId: string; url: string }> {
    const kj = draft.perPlatform.kijiji;
    if (!kj.categoryPath || kj.categoryPath.length === 0) {
      throw new Error('Kijiji requires a category path');
    }

    await session.page.goto(URLS.postAd, { waitUntil: 'domcontentloaded' });
    await ensureNotBlocked(session, 'create');
    await humanDelay(700, 1500);

    // 1. Walk the category cascade. Each step is a button/link with the category name.
    for (const step of kj.categoryPath) {
      const target = session.page
        .getByRole('button', { name: new RegExp(`^${escapeRegex(step)}$`, 'i') })
        .or(session.page.getByRole('link', { name: new RegExp(`^${escapeRegex(step)}$`, 'i') }))
        .first();
      try {
        await target.waitFor({ state: 'visible', timeout: 12_000 });
      } catch {
        const shot = paths.failureScreenshot(PLATFORM, `create_category_${step.replace(/\s+/g, '_')}`);
        await session.page.screenshot({ path: shot }).catch(() => undefined);
        throw new SelectorBrokenError(PLATFORM, 'create', `category[${step}]`, shot);
      }
      await humanClick(target);
      await humanDelay(700, 1400);
    }

    // After cascade Kijiji shows the post-ad form.
    const titleEl = composer.titleInput(session.page).first();
    try {
      await titleEl.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'create_title');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'create', 'composer.titleInput', shot);
    }
    await humanType(titleEl, draft.title);
    await humanDelay();

    // 2. Description
    const descEl = composer.descriptionInput(session.page).first();
    if (await descEl.isVisible().catch(() => false)) {
      await humanType(descEl, draft.description);
      await humanDelay();
    }

    // 3. Price (override or global)
    const price = kj.priceOverrideCents ?? draft.priceCents;
    if (price != null && price > 0) {
      const priceEl = composer.priceInput(session.page).first();
      if (await priceEl.isVisible().catch(() => false)) {
        await humanType(priceEl, String(Math.round(price / 100)));
        await humanDelay();
      }
    }

    // 4. Photos
    if (photoFiles.length > 0) {
      const fileInput = composer.photoFileInput(session.page).first();
      if (await fileInput.count()) {
        await fileInput.setInputFiles(photoFiles);
        await humanDelay(2000, 4000);
      }
    }

    // 5. Submit
    const submit = composer.postButton(session.page).first();
    try {
      await submit.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'create_post_button');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'create', 'composer.postButton', shot);
    }
    await humanClick(submit);
    await humanDelay(3000, 6000);

    // 6. Detect rate limit / captcha post-submit.
    await ensureNotBlocked(session, 'create_post_submit');

    // 7. Find the new ad id. Kijiji redirects to a confirmation that links to the ad, or to My Ads.
    const url = session.page.url();
    const m = url.match(URLS.adIdFromUrl);
    if (m) return { platformAdId: m[1]!, url };

    // Fall back to My Ads — pick the newest row.
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    await humanDelay(800, 1600);
    const firstLink = session.page.locator('a[href*="/v-"]').first();
    const href = await firstLink.getAttribute('href');
    if (href) {
      const mm = href.match(URLS.adIdFromUrl);
      if (mm) return { platformAdId: mm[1]!, url: href.startsWith('http') ? href : `${URLS.base}${href}` };
    }
    throw new Error('Created ad — could not determine new platform ad id');
  },

  async healthCheck(session: BrowserSession): Promise<Pick<PlatformHealth, 'status' | 'loggedIn'>> {
    await session.page.goto(URLS.myAds, { waitUntil: 'domcontentloaded' });
    if (await captcha.text(session.page).first().isVisible().catch(() => false)) {
      return { status: 'paused', loggedIn: true };
    }
    if (!(await this.isLoggedIn(session))) return { status: 'logged_out', loggedIn: false };
    try {
      await myAds.pageHeading(session.page).first().waitFor({ state: 'visible', timeout: 10_000 });
      return { status: 'healthy', loggedIn: true };
    } catch {
      return { status: 'broken', loggedIn: true };
    }
  },
};

