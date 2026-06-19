import type { MarketplaceApi, IPC_EVENTS } from '@shared/types/ipc';

declare global {
  interface Window {
    marketplace: MarketplaceApi;
    marketplaceEvents: typeof IPC_EVENTS;
  }
}

export {};
