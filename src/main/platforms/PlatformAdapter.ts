import type { PlatformId, PlatformHealth } from '@shared/types/platform';
import type { AdDraft, RenewResult, ScrapedAd } from '@shared/types/ad';
import type { BrowserSession } from './BrowserSession';

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly displayName: string;

  /** Launch persistent context and confirm a logged-in session. Throws SessionExpired if not. */
  attachSession(): Promise<BrowserSession>;

  /** Open the platform's login page in a visible window. Resolves immediately — user proceeds manually. */
  interactiveLogin(): Promise<{ session: BrowserSession }>;

  /** Verify a session is currently logged in (without raising). */
  isLoggedIn(session: BrowserSession): Promise<boolean>;

  /** Scrape the user's active listings. Idempotent. */
  listMyAds(session: BrowserSession): Promise<ScrapedAd[]>;

  /** Re-fetch a single ad fresh. */
  getAd(session: BrowserSession, platformAdId: string): Promise<ScrapedAd>;

  /** Attempt platform-native renew/bump. */
  renew(session: BrowserSession, platformAdId: string): Promise<RenewResult>;

  /** Delete the listing on the platform. */
  delete(session: BrowserSession, platformAdId: string): Promise<void>;

  /** Create a new listing from a draft. Returns the new platform ad id. */
  create(session: BrowserSession, draft: AdDraft, photoFiles: string[]): Promise<{ platformAdId: string; url: string }>;

  /** Lightweight health probe: confirms session + key selectors resolve. */
  healthCheck(session: BrowserSession): Promise<Pick<PlatformHealth, 'status' | 'loggedIn'>>;
}
