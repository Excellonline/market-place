import type { Page, Locator } from 'playwright';

/**
 * Kijiji Canada selectors — single source of truth.
 * When this file gets edited, bump docs/selectors.md with the date.
 */

export const URLS = {
  base: 'https://www.kijiji.ca',
  myAds: 'https://www.kijiji.ca/m-my-ads/active.html',
  login: 'https://www.kijiji.ca/t-login.html',
  postAd: 'https://www.kijiji.ca/p-post-ad.html',
  adIdFromUrl: /\/v-[\w-]+\/[\w-]+\/[\w-]+\/(\d+)/,
} as const;

export const loginIndicators = {
  loggedInProbe: (page: Page): Locator =>
    page.getByRole('button', { name: /my account|profile/i })
      .or(page.locator('[data-testid*="account"]'))
      .or(page.getByRole('link', { name: /my account/i })),
  loginEmail: (page: Page): Locator =>
    page.locator('input[type="email"], input[name="emailOrNickname"], input[id*="email" i]'),
};

export const myAds = {
  /** Each row in the My Ads list. */
  rows: (page: Page): Locator =>
    page.locator('[data-testid="my-ad-listing"], [data-qa-id="my-ads-active-list"] li, li[class*="MyAds"]'),
  titleLink: (row: Locator): Locator =>
    row.getByRole('link').first(),
  /** Fallback chain — Kijiji has shipped at least 3 different copy variants over the years. */
  promoteButton: (row: Locator): Locator =>
    row
      .getByRole('button', { name: /bump up|promote|repost ad|move to top/i })
      .or(row.getByRole('link', { name: /bump up|promote|repost ad/i }))
      .or(row.locator('[aria-label*="bump" i], [aria-label*="promote" i]')),
  deleteButton: (row: Locator): Locator =>
    row
      .getByRole('button', { name: /^delete$|^remove$/i })
      .or(row.getByRole('link', { name: /^delete$|^remove$/i }))
      .or(row.locator('[aria-label*="delete" i], [aria-label*="remove" i]')),
  postedDate: (row: Locator): Locator =>
    row.getByText(/(posted|listed) (yesterday|today|\d+ (day|days|hour|hours|week|weeks) ago)|< \d+ hours? ago/i).first(),
  viewsText: (row: Locator): Locator =>
    row.getByText(/^\d+\s*(views?)$/i).first(),
  pageHeading: (page: Page): Locator =>
    page.getByRole('heading', { name: /my ads|active ads/i }),
};

export const promoteModal = {
  /** Some bumps require purchase — we want only the free one. */
  freeBumpOption: (page: Page): Locator =>
    page.getByRole('button', { name: /^bump up$|free bump|use free/i }),
  paidBumpOption: (page: Page): Locator =>
    page.getByRole('button', { name: /buy|upgrade|purchase/i }),
  closeButton: (page: Page): Locator =>
    page.getByRole('button', { name: /close|cancel|^x$/i }),
};

export const adPage = {
  title: (page: Page): Locator => page.getByRole('heading').first(),
  description: (page: Page): Locator =>
    page.locator('[itemprop="description"], [data-testid*="description"]').first(),
  price: (page: Page): Locator =>
    page.locator('[itemprop="price"], [data-testid*="price"]').first(),
  postedDate: (page: Page): Locator =>
    page.getByText(/posted|listed/i).first(),
};

export const composer = {
  titleInput: (page: Page): Locator =>
    page
      .getByLabel(/title/i)
      .or(page.getByRole('textbox', { name: /title/i }))
      .or(page.locator('input[name*="title" i]'))
      .first(),
  descriptionInput: (page: Page): Locator =>
    page
      .getByLabel(/description/i)
      .or(page.getByRole('textbox', { name: /description/i }))
      .or(page.locator('textarea[name*="description" i]'))
      .first(),
  priceInput: (page: Page): Locator =>
    page
      .getByLabel(/price/i)
      .or(page.getByRole('spinbutton', { name: /price/i }))
      .or(page.getByRole('textbox', { name: /price/i }))
      .or(page.locator('input[name*="price" i]'))
      .first(),
  postButton: (page: Page): Locator =>
    page
      .getByRole('button', { name: /^post (your )?ad$|^submit$|^publish$|^post$/i })
      .or(page.getByRole('button', { name: /confirm|done/i }))
      .first(),
  photoFileInput: (page: Page): Locator =>
    page.locator('input[type="file"][accept*="image"]'),
};

export const rateLimit = {
  banner: (page: Page): Locator =>
    page.getByText(/you've reached the limit|rate limit|too many|try again later/i),
};

export const captcha = {
  iframe: (page: Page): Locator =>
    page.frameLocator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"]').locator('body'),
  text: (page: Page): Locator =>
    page.getByText(/verify (you are |you're )?human|prove you're not a robot|complete the captcha/i),
};
