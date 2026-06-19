import type { Ad, AdDraft, AdFilter, AdView, BulkAction, RepostHistoryEntry } from './ad';
import type { PlatformHealth, PlatformId } from './platform';

export const IPC = {
  // ads
  AdsList: 'ads:list',
  AdsGet: 'ads:get',
  AdsRenew: 'ads:renew',
  AdsRepost: 'ads:repost',
  AdsDelete: 'ads:delete',
  AdsBulk: 'ads:bulk',
  AdsHistory: 'ads:history',
  AdsPhotos: 'ads:photos',
  AdsCooldown: 'ads:cooldown',
  AdsRecentFailures: 'ads:recentFailures',
  AdsRecentActivity: 'ads:recentActivity',
  AdsStats: 'ads:stats',
  AdsRescanOne: 'ads:rescanOne',
  AdsExportCsv: 'ads:exportCsv',
  ActivityExportCsv: 'activity:exportCsv',
  ActionsRetry: 'actions:retry',
  AdsSnooze: 'ads:snooze',
  AdsSetNotes: 'ads:setNotes',
  PlatformPause: 'platform:pause',
  ScheduleInfo: 'schedule:info',
  // compose
  ComposeSave: 'compose:save',
  ComposeList: 'compose:list',
  ComposeGet: 'compose:get',
  ComposeDelete: 'compose:delete',
  ComposePublish: 'compose:publish',
  // photos
  PhotosImport: 'photos:import',
  PhotosGetData: 'photos:data',
  PhotosGetThumb: 'photos:thumb',
  PhotosStoreBytes: 'photos:storeBytes',
  // platforms
  PlatformHealth: 'platform:health',
  PlatformStartLogin: 'platform:login',
  PlatformConfirmLogin: 'platform:loginConfirm',
  PlatformResolve: 'platform:resolve',
  PlatformReset: 'platform:reset',
  // scan
  ScanAll: 'scan:all',
  ScanPlatform: 'scan:platform',
  ScanCancel: 'scan:cancel',
  // settings
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  // shell helpers
  ShellOpenUserData: 'shell:openUserData',
  ShellRevealPath: 'shell:reveal',
  DataBackup: 'data:backup',
  DataReadFileAsDataUrl: 'data:readFileAsDataUrl',
} as const;

export type IpcChannel = typeof IPC[keyof typeof IPC];

export const IPC_EVENTS = {
  ScanProgress: 'scan:progress',
  ScanComplete: 'scan:complete',
  ScanError: 'scan:error',
  PlatformHealthChanged: 'platform:healthChanged',
  AdUpdated: 'ad:updated',
  Notification: 'notification:new',
} as const;

export type IpcEvent = typeof IPC_EVENTS[keyof typeof IPC_EVENTS];

export interface ScanProgressPayload {
  platform: PlatformId;
  step: 'login_check' | 'list' | 'enrich' | 'done';
  current: number;
  total: number;
}

export interface ScanCompletePayload {
  platform: PlatformId;
  scanned: number;
  succeeded: boolean;
  errorMessage: string | null;
}

export interface NotificationPayload {
  title: string;
  body: string;
  platform: PlatformId | null;
  level: 'info' | 'warn' | 'error';
}

export interface MarketplaceApi {
  listAds(filter: AdFilter): Promise<AdView[]>;
  getAd(id: string): Promise<Ad | null>;
  renew(id: string): Promise<{ ok: boolean; message?: string }>;
  repost(id: string): Promise<{ ok: boolean; newAdId?: string; message?: string }>;
  deleteAd(id: string): Promise<{ ok: boolean; message?: string }>;
  bulkAction(ids: string[], action: BulkAction): Promise<{ ok: boolean; results: Array<{ id: string; ok: boolean; message?: string }> }>;
  getHistory(logicalAdId: string): Promise<RepostHistoryEntry[]>;
  getPhotos(adId: string): Promise<Array<{ hash: string; orderIndex: number }>>;
  getCooldown(adId: string): Promise<{ nextAllowedAt: number | null; dailyCount: number; dailyCap: number }>;
  getRecentFailures(limit?: number): Promise<RepostHistoryEntry[]>;
  getRecentActivity(opts?: { limit?: number; platform?: import('./platform').PlatformId; actions?: string[]; onlyFailures?: boolean }): Promise<RepostHistoryEntry[]>;
  getStats(sinceDays?: number): Promise<{
    totalActions: number;
    successCount: number;
    failureCount: number;
    byAction: Record<string, number>;
  }>;
  rescanAd(adId: string): Promise<{ ok: boolean; message?: string }>;
  exportAdsCsv(): Promise<{ ok: boolean; path?: string }>;
  exportActivityCsv(): Promise<{ ok: boolean; path?: string }>;
  retryAction(payload: { action: string; logicalAdId: string }): Promise<{ ok: boolean; message?: string }>;
  snoozeAd(adId: string, until: number | null): Promise<{ ok: boolean }>;
  setNotes(adId: string, notes: string | null): Promise<{ ok: boolean }>;
  pausePlatform(platform: import('./platform').PlatformId, until: number | null): Promise<{ ok: boolean }>;
  scheduleInfo(): Promise<{
    cron: string;
    scansPaused: boolean;
    nextRunAt: number | null;
    platforms: Record<string, { pausedUntil: number | null }>;
  }>;

  saveDraft(draft: AdDraft): Promise<AdDraft>;
  listDrafts(): Promise<AdDraft[]>;
  getDraft(id: string): Promise<AdDraft | null>;
  deleteDraft(id: string): Promise<void>;
  publishDraft(draftId: string, platforms: PlatformId[]): Promise<{ ok: boolean; perPlatform: Record<string, { ok: boolean; platformAdId?: string; message?: string }> }>;

  importPhotos(): Promise<{ hashes: string[] }>;
  getPhotoDataUrl(hash: string): Promise<string | null>;
  getThumbDataUrl(hash: string): Promise<string | null>;
  storePhotoBytes(bytes: ArrayBuffer): Promise<{ hash: string } | null>;

  platformHealth(): Promise<PlatformHealth[]>;
  startLogin(platform: PlatformId): Promise<{ ok: boolean }>;
  confirmLoggedIn(platform: PlatformId): Promise<{ ok: boolean; loggedIn: boolean }>;
  resolveIntervention(platform: PlatformId): Promise<{ ok: boolean }>;
  resetPlatform(platform: PlatformId): Promise<{ ok: boolean }>;

  scanAll(): Promise<{ ok: boolean }>;
  scanPlatform(platform: PlatformId): Promise<{ ok: boolean }>;
  cancelScan(): Promise<{ ok: boolean }>;

  getSettings(): Promise<Record<string, unknown>>;
  setSetting(key: string, value: unknown): Promise<void>;

  openUserDataFolder(): Promise<void>;
  revealPath(filePath: string): Promise<void>;
  backupUserData(): Promise<{ ok: boolean; path?: string; sizeBytes?: number; message?: string }>;
  /** Read an absolute path inside the user-data dir as a data URL — used for failure screenshots. */
  readSafeImageAsDataUrl(filePath: string): Promise<string | null>;

  on<E extends IpcEvent>(event: E, cb: (payload: unknown) => void): () => void;
}
