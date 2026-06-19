import type { Page, Locator } from 'playwright';

/**
 * Facebook Marketplace selectors — single source of truth.
 * When this file gets edited, bump docs/selectors.md with the date.
 *
 * Strategy: prefer getByRole + accessible name (survives DOM churn). Use text fallbacks.
 * Avoid auto-generated CSS paths.
 */

export const URLS = {
  base: 'https://www.facebook.com',
  marketplace: 'https://www.facebook.com/marketplace',
  yourListings: 'https://www.facebook.com/marketplace/you/selling',
  login: 'https://www.facebook.com/login',
  createItem: 'https://www.facebook.com/marketplace/create/item',
  itemPattern: /\/marketplace\/item\/(\d+)/,
  checkpoint: /\/checkpoint\//,
} as const;

export const loginIndicators = {
  // Truthy if logged in: composer/marketplace nav. Falsy: login form fields.
  loggedInProbe: (page: Page): Locator =>
    page.getByRole('navigation', { name: /facebook/i }).or(page.locator('[aria-label="Account"]')),
  loginFormEmail: (page: Page): Locator => page.locator('input[name="email"], input[id="email"]'),
};

export const listings = {
  /** Each card on /marketplace/you/selling. Cards link to /marketplace/item/<id>/edit or /<id>/. */
  itemLinks: (page: Page): Locator =>
    page.locator('a[href*="/marketplace/item/"]'),
  /** "Your listings" heading — used by healthCheck. */
  heading: (page: Page): Locator =>
    page.getByRole('heading', { name: /your listings|selling/i }),
};

export const itemPage = {
  title: (page: Page): Locator =>
    page.getByRole('heading').first(),
  /**
   * Buttons within the three-dot menu we care about.
   * Fallback chain because FB renders this as an icon button with shifting aria-labels.
   */
  moreActionsButton: (page: Page): Locator =>
    page
      .getByRole('button', { name: /more.*action|^options$/i })
      .or(page.getByRole('button', { name: /^more$/i }))
      .or(page.locator('[aria-label*="More" i][role="button"]'))
      .or(page.locator('[aria-label*="options" i][role="button"]'))
      .first(),
  markAsAvailable: (page: Page): Locator =>
    page.getByRole('menuitem', { name: /mark as available/i }).or(page.getByRole('button', { name: /mark as available/i })),
  markAsSold: (page: Page): Locator =>
    page.getByRole('menuitem', { name: /mark as sold/i }).or(page.getByRole('button', { name: /mark as sold/i })),
  deleteListing: (page: Page): Locator =>
    page.getByRole('menuitem', { name: /delete listing/i }).or(page.getByRole('button', { name: /delete listing/i })),
  confirmDelete: (page: Page): Locator =>
    page.getByRole('button', { name: /^delete$/i }),
  editListing: (page: Page): Locator =>
    page.getByRole('link', { name: /edit listing/i }).or(page.getByRole('button', { name: /edit listing/i })),
  description: (page: Page): Locator =>
    // Description sits below the title heading; this is fragile and may need adjustment.
    page.locator('[role="main"] div[dir="auto"]').first(),
  postedDate: (page: Page): Locator =>
    page.getByText(/listed (yesterday|today|\d+ (day|days|hour|hours|minute|minutes|week|weeks|month|months) ago)/i).first(),
};

export const composer = {
  titleInput: (page: Page): Locator =>
    page
      .getByRole('textbox', { name: /^title$/i })
      .or(page.getByRole('textbox', { name: /title/i }))
      .or(page.getByLabel(/title/i))
      .first(),
  priceInput: (page: Page): Locator =>
    page
      .getByRole('textbox', { name: /^price$/i })
      .or(page.getByRole('spinbutton', { name: /price/i }))
      .or(page.getByLabel(/price/i))
      .first(),
  descriptionInput: (page: Page): Locator =>
    page
      .getByRole('textbox', { name: /description/i })
      .or(page.getByLabel(/description/i))
      .first(),
  categoryPicker: (page: Page): Locator =>
    page
      .getByRole('combobox', { name: /category/i })
      .or(page.getByLabel(/category/i))
      .or(page.getByRole('button', { name: /category/i }))
      .first(),
  conditionPicker: (page: Page): Locator =>
    page
      .getByRole('combobox', { name: /condition/i })
      .or(page.getByLabel(/condition/i))
      .or(page.getByRole('button', { name: /^condition$/i }))
      .first(),
  publishButton: (page: Page): Locator =>
    page
      .getByRole('button', { name: /^publish$/i })
      .or(page.getByRole('button', { name: /post$/i }))
      .first(),
  nextButton: (page: Page): Locator =>
    page
      .getByRole('button', { name: /^next$/i })
      .or(page.getByRole('button', { name: /^continue$/i }))
      .first(),
  photoFileInput: (page: Page): Locator =>
    page.locator('input[type="file"][accept*="image"]'),
};

export const boostModal = {
  skipButton: (page: Page): Locator =>
    page.getByRole('button', { name: /not now|skip|maybe later|no thanks/i }),
};

export const checkpointSignals = {
  bodyText: (page: Page): Locator =>
    page.getByText(/we need to confirm|confirm it's you|security check|verify it's you/i),
};
