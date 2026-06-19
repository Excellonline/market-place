import type { PlatformId } from './platform';

export type AdStatus = 'active' | 'expired' | 'deleted' | 'pending';

export interface Ad {
  id: string;
  logicalAdId: string;
  platform: PlatformId;
  platformAdId: string | null;
  title: string;
  description: string;
  priceCents: number | null;
  currency: string;
  category: string | null;
  status: AdStatus;
  url: string | null;
  views: number | null;
  postedAt: number;
  lastRenewedAt: number | null;
  lastScrapedAt: number | null;
  snoozedUntil: number | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdView extends Ad {
  ageDays: number;
  photoCount: number;
  thumbHash: string | null;
  thumbPath: string | null;
  siblingPlatforms: PlatformId[];
  lastActionLabel: string | null;
  lastActionAt: number | null;
}

export interface AdPhoto {
  id: string;
  adId: string;
  photoHash: string;
  orderIndex: number;
  originalUrl: string | null;
}

export interface AdDraft {
  id: string;
  title: string;
  description: string;
  priceCents: number | null;
  currency: string;
  perPlatform: Record<PlatformId, PerPlatformDraftFields>;
  photoHashes: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PerPlatformDraftFields {
  enabled: boolean;
  category: string | null;
  categoryPath: string[] | null;
  condition: string | null;
  priceOverrideCents: number | null;
  locationRadiusKm: number | null;
}

export interface ScrapedAd {
  platformAdId: string;
  title: string;
  description: string;
  priceCents: number | null;
  currency: string;
  category: string | null;
  status: AdStatus;
  url: string;
  views: number | null;
  postedAt: number;
  photoUrls: string[];
}

export type RenewResult = 'renewed' | 'not_supported' | 'failed';

export interface AdFilter {
  platforms?: PlatformId[];
  minAgeDays?: number;
  maxAgeDays?: number;
  status?: AdStatus[];
  search?: string;
}

export type RepostAction = 'scan' | 'renew' | 'repost' | 'create' | 'delete';

export interface RepostHistoryEntry {
  id: string;
  logicalAdId: string;
  platform: PlatformId;
  action: RepostAction;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  beforeAdId: string | null;
  afterAdId: string | null;
  timestamp: number;
}

export type BulkAction = 'renew' | 'repost' | 'delete' | 'snooze_1d' | 'snooze_7d' | 'unsnooze';
