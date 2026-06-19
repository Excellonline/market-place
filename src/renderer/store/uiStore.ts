import { create } from 'zustand';
import type { PlatformId } from '@shared/types/platform';
import type { AdStatus } from '@shared/types/ad';

interface UiState {
  platformFilter: PlatformId[];
  statusFilter: AdStatus[];
  minAgeDays: number | null;
  maxAgeDays: number | null;
  search: string;
  selectedIds: Set<string>;

  setPlatformFilter(platforms: PlatformId[]): void;
  setStatusFilter(statuses: AdStatus[]): void;
  setAgeRange(min: number | null, max: number | null): void;
  setSearch(s: string): void;
  toggleSelection(id: string): void;
  clearSelection(): void;
  selectAll(ids: string[]): void;
}

export const useUiStore = create<UiState>((set) => ({
  platformFilter: [],
  statusFilter: ['active'],
  minAgeDays: null,
  maxAgeDays: null,
  search: '',
  selectedIds: new Set(),

  setPlatformFilter: (platforms) => set({ platformFilter: platforms }),
  setStatusFilter: (statuses) => set({ statusFilter: statuses }),
  setAgeRange: (min, max) => set({ minAgeDays: min, maxAgeDays: max }),
  setSearch: (search) => set({ search }),
  toggleSelection: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  clearSelection: () => set({ selectedIds: new Set() }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
}));
