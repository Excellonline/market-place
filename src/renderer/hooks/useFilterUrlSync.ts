import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from '../store/uiStore';
import { PLATFORM_IDS, type PlatformId } from '@shared/types/platform';
import type { AdStatus } from '@shared/types/ad';

const STATUSES: AdStatus[] = ['active', 'expired', 'deleted', 'pending'];

/**
 * Two-way sync the dashboard filter UI state with the URL query string.
 * - On mount: hydrate the store from the URL (refresh-safe, bookmarkable).
 * - On change: write the active filters back to the URL.
 */
export function useFilterUrlSync(enabled: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const setPlatformFilter = useUiStore((s) => s.setPlatformFilter);
  const setStatusFilter = useUiStore((s) => s.setStatusFilter);
  const setAgeRange = useUiStore((s) => s.setAgeRange);
  const setSearch = useUiStore((s) => s.setSearch);
  const platformFilter = useUiStore((s) => s.platformFilter);
  const statusFilter = useUiStore((s) => s.statusFilter);
  const minAgeDays = useUiStore((s) => s.minAgeDays);
  const maxAgeDays = useUiStore((s) => s.maxAgeDays);
  const search = useUiStore((s) => s.search);

  const hydratedRef = useRef(false);

  // Hydrate from URL once on mount.
  useEffect(() => {
    if (!enabled || hydratedRef.current) return;
    hydratedRef.current = true;
    const qs = new URLSearchParams(location.search);
    const p = qs.getAll('p').filter((x): x is PlatformId => (PLATFORM_IDS as readonly string[]).includes(x));
    if (p.length > 0) setPlatformFilter(p);
    const s = qs.getAll('s').filter((x): x is AdStatus => (STATUSES as string[]).includes(x));
    if (s.length > 0) setStatusFilter(s);
    const minA = qs.get('min');
    const maxA = qs.get('max');
    if (minA !== null || maxA !== null) {
      setAgeRange(minA !== null ? Number(minA) : null, maxA !== null ? Number(maxA) : null);
    }
    const q = qs.get('q');
    if (q) setSearch(q);
  }, [enabled, location.search, setPlatformFilter, setStatusFilter, setAgeRange, setSearch]);

  // Write back to URL when filters change.
  useEffect(() => {
    if (!enabled || !hydratedRef.current) return;
    const qs = new URLSearchParams();
    for (const p of platformFilter) qs.append('p', p);
    for (const s of statusFilter) qs.append('s', s);
    if (minAgeDays !== null) qs.set('min', String(minAgeDays));
    if (maxAgeDays !== null) qs.set('max', String(maxAgeDays));
    if (search) qs.set('q', search);
    const next = qs.toString();
    const target = next ? `${location.pathname}?${next}` : location.pathname;
    const current = location.pathname + (location.search ? location.search : '');
    if (current !== target) {
      navigate(target, { replace: true });
    }
  }, [enabled, platformFilter, statusFilter, minAgeDays, maxAgeDays, search, navigate, location.pathname, location.search]);
}
