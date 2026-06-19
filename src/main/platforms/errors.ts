import type { PlatformId } from '@shared/types/platform';

export class PlatformError extends Error {
  constructor(
    public readonly platform: PlatformId,
    public readonly code: string,
    message: string,
    public readonly screenshotPath: string | null = null,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SelectorBrokenError extends PlatformError {
  constructor(platform: PlatformId, public readonly step: string, public readonly locatorName: string, screenshotPath: string | null = null) {
    super(
      platform,
      'selector_broken',
      `Selector broken on ${platform} during step "${step}" (locator "${locatorName}"). Update src/main/platforms/${platform}/selectors.ts.`,
      screenshotPath,
    );
  }
}

export class HumanInterventionRequired extends PlatformError {
  constructor(platform: PlatformId, public readonly reason: string, screenshotPath: string | null = null) {
    super(platform, 'human_intervention', `Manual action needed on ${platform}: ${reason}`, screenshotPath);
  }
}

export class SessionExpired extends PlatformError {
  constructor(platform: PlatformId) {
    super(platform, 'session_expired', `Session expired on ${platform}. Re-login required.`);
  }
}

export class RateLimitedError extends PlatformError {
  constructor(platform: PlatformId, public readonly resetAt: number | null) {
    super(platform, 'rate_limited', `Rate limited on ${platform}${resetAt ? ` until ${new Date(resetAt).toLocaleString()}` : ''}.`);
  }
}

export class CooldownError extends Error {
  constructor(public readonly logicalAdId: string, public readonly nextAllowedAt: number) {
    super(`Per-ad cooldown active. Try again after ${new Date(nextAllowedAt).toLocaleString()}.`);
    this.name = 'CooldownError';
  }
}

export class DailyCapReached extends Error {
  constructor(public readonly platform: PlatformId, public readonly cap: number) {
    super(`Daily action cap reached for ${platform} (${cap} actions).`);
    this.name = 'DailyCapReached';
  }
}
