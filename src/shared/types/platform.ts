export const PLATFORM_IDS = ['facebook', 'kijiji'] as const;
export type PlatformId = typeof PLATFORM_IDS[number];

export const PLATFORM_DISPLAY_NAMES: Record<PlatformId, string> = {
  facebook: 'Facebook Marketplace',
  kijiji: 'Kijiji',
};

export type PlatformHealthStatus = 'healthy' | 'broken' | 'paused' | 'rate_limited' | 'logged_out' | 'unknown';

export interface PlatformHealth {
  platform: PlatformId;
  status: PlatformHealthStatus;
  loggedIn: boolean;
  lastScanAt: number | null;
  lastScanSucceeded: boolean;
  lastErrorMessage: string | null;
  lastErrorScreenshot: string | null;
  rateLimitedUntil: number | null;
}
