import { contextBridge, ipcRenderer } from 'electron';
import { IPC, IPC_EVENTS, type IpcEvent, type MarketplaceApi } from '../shared/types/ipc';

const api: MarketplaceApi = {
  // ads
  listAds: (filter) => ipcRenderer.invoke(IPC.AdsList, filter),
  getAd: (id) => ipcRenderer.invoke(IPC.AdsGet, id),
  renew: (id) => ipcRenderer.invoke(IPC.AdsRenew, id),
  repost: (id) => ipcRenderer.invoke(IPC.AdsRepost, id),
  deleteAd: (id) => ipcRenderer.invoke(IPC.AdsDelete, id),
  bulkAction: (ids, action) => ipcRenderer.invoke(IPC.AdsBulk, { ids, action }),
  getHistory: (logicalAdId) => ipcRenderer.invoke(IPC.AdsHistory, logicalAdId),
  getPhotos: (adId) => ipcRenderer.invoke(IPC.AdsPhotos, adId),
  getCooldown: (adId) => ipcRenderer.invoke(IPC.AdsCooldown, adId),
  getRecentFailures: (limit) => ipcRenderer.invoke(IPC.AdsRecentFailures, limit),
  getRecentActivity: (opts) => ipcRenderer.invoke(IPC.AdsRecentActivity, opts),
  getStats: (sinceDays) => ipcRenderer.invoke(IPC.AdsStats, sinceDays),
  rescanAd: (adId) => ipcRenderer.invoke(IPC.AdsRescanOne, adId),
  exportAdsCsv: () => ipcRenderer.invoke(IPC.AdsExportCsv),
  exportActivityCsv: () => ipcRenderer.invoke(IPC.ActivityExportCsv),
  retryAction: (payload) => ipcRenderer.invoke(IPC.ActionsRetry, payload),
  snoozeAd: (adId, until) => ipcRenderer.invoke(IPC.AdsSnooze, { adId, until }),
  setNotes: (adId, notes) => ipcRenderer.invoke(IPC.AdsSetNotes, { adId, notes }),
  pausePlatform: (platform, until) => ipcRenderer.invoke(IPC.PlatformPause, { platform, until }),
  scheduleInfo: () => ipcRenderer.invoke(IPC.ScheduleInfo),

  // compose
  saveDraft: (draft) => ipcRenderer.invoke(IPC.ComposeSave, draft),
  listDrafts: () => ipcRenderer.invoke(IPC.ComposeList),
  getDraft: (id) => ipcRenderer.invoke(IPC.ComposeGet, id),
  deleteDraft: (id) => ipcRenderer.invoke(IPC.ComposeDelete, id),
  publishDraft: (draftId, platforms) => ipcRenderer.invoke(IPC.ComposePublish, { draftId, platforms }),

  // photos
  importPhotos: () => ipcRenderer.invoke(IPC.PhotosImport),
  getPhotoDataUrl: (hash) => ipcRenderer.invoke(IPC.PhotosGetData, hash),
  getThumbDataUrl: (hash) => ipcRenderer.invoke(IPC.PhotosGetThumb, hash),
  storePhotoBytes: (bytes) => ipcRenderer.invoke(IPC.PhotosStoreBytes, bytes),

  // platforms
  platformHealth: () => ipcRenderer.invoke(IPC.PlatformHealth),
  startLogin: (platform) => ipcRenderer.invoke(IPC.PlatformStartLogin, platform),
  confirmLoggedIn: (platform) => ipcRenderer.invoke(IPC.PlatformConfirmLogin, platform),
  resolveIntervention: (platform) => ipcRenderer.invoke(IPC.PlatformResolve, platform),
  resetPlatform: (platform) => ipcRenderer.invoke(IPC.PlatformReset, platform),

  // scan
  scanAll: () => ipcRenderer.invoke(IPC.ScanAll),
  scanPlatform: (platform) => ipcRenderer.invoke(IPC.ScanPlatform, platform),
  cancelScan: () => ipcRenderer.invoke(IPC.ScanCancel),

  // settings
  getSettings: () => ipcRenderer.invoke(IPC.SettingsGet),
  setSetting: (key, value) => ipcRenderer.invoke(IPC.SettingsSet, { key, value }),

  // shell
  openUserDataFolder: () => ipcRenderer.invoke(IPC.ShellOpenUserData),
  revealPath: (filePath) => ipcRenderer.invoke(IPC.ShellRevealPath, filePath),
  backupUserData: () => ipcRenderer.invoke(IPC.DataBackup),
  readSafeImageAsDataUrl: (filePath) => ipcRenderer.invoke(IPC.DataReadFileAsDataUrl, filePath),

  // events
  on(event, cb) {
    const channel: IpcEvent = event;
    const listener = (_: unknown, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.off(channel, listener);
  },
};

contextBridge.exposeInMainWorld('marketplace', api);
contextBridge.exposeInMainWorld('marketplaceEvents', IPC_EVENTS);

declare global {
  interface Window {
    marketplace: MarketplaceApi;
    marketplaceEvents: typeof IPC_EVENTS;
  }
}
