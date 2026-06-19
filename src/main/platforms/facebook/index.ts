import type { PlatformAdapter } from '../PlatformAdapter';
import type { PlatformId, PlatformHealth } from '@shared/types/platform';
import type { AdDraft, RenewResult, ScrapedAd } from '@shared/types/ad';
import { launchPersistent, type BrowserSession } from '../BrowserSession';
import { HumanInterventionRequired, SelectorBrokenError, SessionExpired } from '../errors';
import { humanClick, humanDelay } from '../humanize';
import { logger } from '../../logger';
import { paths } from '../../paths';
import { URLS, listings, itemPage, loginIndicators, checkpointSignals, boostModal, composer } from './selectors';
import { humanType } from '../humanize';
import { parseFacebookRelativeDate, parsePriceCents, escapeRegex } from './parsers';

const PLATFORM: PlatformId = 'facebook';

async function ensureNotCheckpoint(session: BrowserSession): Promise<void> {
  const url = session.page.url();
  if (URLS.checkpoint.test(url)) {
    const shot = paths.failureScreenshot(PLATFORM, 'checkpoint');
    await session.page.screenshot({ path: shot }).catch(() => undefined);
    throw new HumanInterventionRequired(PLATFORM, 'security checkpoint page', shot);
  }
  if (await checkpointSignals.bodyText(session.page).first().isVisible().catch(() => false)) {
    const shot = paths.failureScreenshot(PLATFORM, 'checkpoint_text');
    await session.page.screenshot({ path: shot }).catch(() => undefined);
    throw new HumanInterventionRequired(PLATFORM, 'identity confirmation requested', shot);
  }
}

async function dismissBoostModalIfPresent(session: BrowserSession): Promise<void> {
  const skip = boostModal.skipButton(session.page);
  if (await skip.first().isVisible().catch(() => false)) {
    await humanClick(skip.first()).catch(() => undefined);
    await humanDelay(400, 900);
  }
}

export const facebookAdapter: PlatformAdapter = {
  id: PLATFORM,
  displayName: 'Facebook Marketplace',

  async attachSession(): Promise<BrowserSession> {
    const session = await launchPersistent(PLATFORM);
    await session.page.goto(URLS.marketplace, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);
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
    // If the email login form is visible, we are not logged in.
    const emailVisible = await loginIndicators.loginFormEmail(session.page).first().isVisible().catch(() => false);
    if (emailVisible) return false;
    const probeVisible = await loginIndicators.loggedInProbe(session.page).first().isVisible().catch(() => false);
    return probeVisible;
  },

  async listMyAds(session: BrowserSession): Promise<ScrapedAd[]> {
    await session.page.goto(URLS.yourListings, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);
    await dismissBoostModalIfPresent(session);
    await humanDelay(600, 1500);

    try {
      await listings.heading(session.page).first().waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'list_heading');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'list', 'listings.heading', shot);
    }

    const hrefs = await listings.itemLinks(session.page).evaluateAll((els) =>
      Array.from(new Set(els.map((e) => (e as unknown as { href: string }).href).filter((h) => /\/marketplace\/item\/\d+/.test(h)))),
    );

    const ids = new Set<string>();
    const ads: ScrapedAd[] = [];

    for (const href of hrefs) {
      const m = href.match(URLS.itemPattern);
      if (!m) continue;
      const id = m[1]!;
      if (ids.has(id)) continue;
      ids.add(id);

      try {
        const ad = await this.getAd(session, id);
        ads.push(ad);
        await humanDelay(1200, 2800);
      } catch (err) {
        logger().warn({ err, id }, 'failed to scrape FB item');
      }
    }
    return ads;
  },

  async getAd(session: BrowserSession, platformAdId: string): Promise<ScrapedAd> {
    const url = `${URLS.base}/marketplace/item/${platformAdId}/`;
    await session.page.goto(url, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);

    let title: string;
    try {
      title = (await itemPage.title(session.page).first().textContent({ timeout: 10_000 })) ?? '';
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'read_title');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'read', 'itemPage.title', shot);
    }

    // Posted-date heuristic — try the relative date text; fall back to "unknown" (postedAt now).
    let postedAt = Date.now();
    const dateText = await itemPage.postedDate(session.page).first().textContent().catch(() => null);
    if (dateText) {
      postedAt = parseFacebookRelativeDate(dateText) ?? postedAt;
    }

    const description =
      (await itemPage.description(session.page).first().textContent().catch(() => null))?.trim() ?? '';

    // Price extraction: scan visible "$..." text near title. Cheap heuristic; refine if needed.
    const priceText =
      (await session.page.getByText(/^\s*(CA\$|US\$|\$)\s?\d/i).first().textContent().catch(() => null))?.trim() ?? null;
    const priceCents = parsePriceCents(priceText);

    const photoUrls = await session.page
      .locator('[role="main"] img')
      .evaluateAll((imgs) =>
        Array.from(
          new Set(
            (imgs as unknown as Array<{ src: string }>)
              .map((img) => img.src)
              .filter((src) => src.startsWith('http') && /scontent|fbcdn/i.test(src)),
          ),
        ),
      )
      .catch(() => []);

    return {
      platformAdId,
      title: title.trim(),
      description,
      priceCents,
      currency: 'CAD',
      category: null,
      status: 'active',
      url,
      views: null,
      postedAt,
      photoUrls,
    };
  },

  async renew(session: BrowserSession, platformAdId: string): Promise<RenewResult> {
    // Facebook has no native renew. Try "Mark as sold then available" as a soft bump.
    const url = `${URLS.base}/marketplace/item/${platformAdId}/`;
    await session.page.goto(url, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);
    await humanDelay();

    const more = itemPage.moreActionsButton(session.page);
    if (!(await more.first().isVisible().catch(() => false))) {
      return 'not_supported';
    }
    await humanClick(more.first());
    await humanDelay(400, 800);

    const available = itemPage.markAsAvailable(session.page);
    if (await available.first().isVisible().catch(() => false)) {
      await humanClick(available.first());
      await humanDelay(800, 1600);
      return 'renewed';
    }
    return 'not_supported';
  },

  async delete(session: BrowserSession, platformAdId: string): Promise<void> {
    const url = `${URLS.base}/marketplace/item/${platformAdId}/`;
    await session.page.goto(url, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);
    await humanDelay();

    const more = itemPage.moreActionsButton(session.page);
    if (!(await more.first().isVisible().catch(() => false))) {
      const shot = paths.failureScreenshot(PLATFORM, 'delete_more_menu');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'delete', 'itemPage.moreActionsButton', shot);
    }
    await humanClick(more.first());
    await humanDelay(400, 800);

    const del = itemPage.deleteListing(session.page);
    if (!(await del.first().isVisible().catch(() => false))) {
      const shot = paths.failureScreenshot(PLATFORM, 'delete_menu_item');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'delete', 'itemPage.deleteListing', shot);
    }
    await humanClick(del.first());
    await humanDelay(500, 1100);

    const confirm = itemPage.confirmDelete(session.page);
    if (await confirm.first().isVisible().catch(() => false)) {
      await humanClick(confirm.first());
    }
    await humanDelay(1500, 3000);
  },

  async create(session: BrowserSession, draft: AdDraft, photoFiles: string[]): Promise<{ platformAdId: string; url: string }> {
    if (photoFiles.length === 0) throw new Error('Facebook requires at least one photo');

    await session.page.goto(URLS.createItem, { waitUntil: 'domcontentloaded' });
    await ensureNotCheckpoint(session);
    await dismissBoostModalIfPresent(session);
    await humanDelay(800, 1600);

    // 1. Upload photos (file input is present from the start, but invisible — setInputFiles handles that).
    const fileInput = composer.photoFileInput(session.page);
    if (!(await fileInput.first().count())) {
      const shot = paths.failureScreenshot(PLATFORM, 'create_photo_input');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'create', 'composer.photoFileInput', shot);
    }
    await fileInput.first().setInputFiles(photoFiles);
    await humanDelay(1500, 3000);

    // 2. Title
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

    // 3. Price (use override if present, else global; if both null, leave empty for "Free").
    const fb = draft.perPlatform.facebook;
    const price = fb.priceOverrideCents ?? draft.priceCents;
    if (price != null && price > 0) {
      const priceEl = composer.priceInput(session.page).first();
      if (await priceEl.isVisible().catch(() => false)) {
        await humanType(priceEl, String(Math.round(price / 100)));
      }
      await humanDelay();
    }

    // 4. Category — typeahead. Type the name, wait for option, click it.
    if (fb.category) {
      const cat = composer.categoryPicker(session.page).first();
      if (await cat.isVisible().catch(() => false)) {
        await humanClick(cat);
        await humanDelay(400, 800);
        await session.page.keyboard.type(fb.category, { delay: 60 });
        await humanDelay(600, 1100);
        const option = session.page.getByRole('option', { name: new RegExp(`^${escapeRegex(fb.category)}$`, 'i') }).first();
        try {
          await option.waitFor({ state: 'visible', timeout: 5000 });
          await humanClick(option);
        } catch {
          // Soft-fail: try the first option offered
          const firstOption = session.page.getByRole('option').first();
          if (await firstOption.isVisible().catch(() => false)) await humanClick(firstOption);
        }
        await humanDelay();
      }
    }

    // 5. Condition — combobox.
    if (fb.condition) {
      const cond = composer.conditionPicker(session.page).first();
      if (await cond.isVisible().catch(() => false)) {
        await humanClick(cond);
        await humanDelay(300, 700);
        const condOption = session.page.getByRole('option', { name: new RegExp(escapeRegex(fb.condition), 'i') }).first();
        if (await condOption.isVisible().catch(() => false)) {
          await humanClick(condOption);
        }
        await humanDelay();
      }
    }

    // 6. Description
    const descEl = composer.descriptionInput(session.page).first();
    if (await descEl.isVisible().catch(() => false)) {
      await humanType(descEl, draft.description);
      await humanDelay();
    }

    // 7. Next → Publish. FB shows a "Next" page before "Publish". Click Next if present, then Publish.
    const next = composer.nextButton(session.page).first();
    if (await next.isVisible().catch(() => false)) {
      await humanClick(next);
      await humanDelay(1000, 2000);
    }

    const publish = composer.publishButton(session.page).first();
    try {
      await publish.waitFor({ state: 'visible', timeout: 15_000 });
    } catch {
      const shot = paths.failureScreenshot(PLATFORM, 'create_publish');
      await session.page.screenshot({ path: shot }).catch(() => undefined);
      throw new SelectorBrokenError(PLATFORM, 'create', 'composer.publishButton', shot);
    }
    await humanClick(publish);
    await humanDelay(3000, 5000);

    // Wait for redirect to the new item page or your listings.
    await session.page
      .waitForURL((u) => URLS.itemPattern.test(u.toString()) || /\/marketplace\/you\//.test(u.toString()), { timeout: 30_000 })
      .catch(() => undefined);

    const url = session.page.url();
    const m = url.match(URLS.itemPattern);
    if (m) return { platformAdId: m[1]!, url };

    // Fallback: scrape your-listings for the newest item with this title.
    await session.page.goto(URLS.yourListings, { waitUntil: 'domcontentloaded' });
    await humanDelay(800, 1600);
    const link = session.page.locator(`a[href*="/marketplace/item/"]`).first();
    const href = await link.getAttribute('href');
    if (href) {
      const mm = href.match(URLS.itemPattern);
      if (mm) return { platformAdId: mm[1]!, url: href.startsWith('http') ? href : `${URLS.base}${href}` };
    }
    throw new Error('Created ad — could not determine new platform ad id');
  },

  async healthCheck(session: BrowserSession): Promise<Pick<PlatformHealth, 'status' | 'loggedIn'>> {
    await session.page.goto(URLS.yourListings, { waitUntil: 'domcontentloaded' });
    if (URLS.checkpoint.test(session.page.url())) return { status: 'paused', loggedIn: true };
    if (!(await this.isLoggedIn(session))) return { status: 'logged_out', loggedIn: false };
    try {
      await listings.heading(session.page).first().waitFor({ state: 'visible', timeout: 15_000 });
      return { status: 'healthy', loggedIn: true };
    } catch {
      return { status: 'broken', loggedIn: true };
    }
  },
};

