import { getDb } from '../index';
import { createId } from '../../ids';
import type { AdPhoto } from '@shared/types/ad';

interface PhotoRow {
  id: string;
  ad_id: string;
  photo_hash: string;
  order_index: number;
  original_url: string | null;
}

function rowToPhoto(r: PhotoRow): AdPhoto {
  return {
    id: r.id,
    adId: r.ad_id,
    photoHash: r.photo_hash,
    orderIndex: r.order_index,
    originalUrl: r.original_url,
  };
}

export const photosRepo = {
  setForAd(adId: string, photos: Array<{ hash: string; originalUrl?: string | null }>): void {
    const tx = getDb().transaction(() => {
      getDb().prepare('DELETE FROM ad_photos WHERE ad_id = ?').run(adId);
      const ins = getDb().prepare(
        'INSERT INTO ad_photos (id, ad_id, photo_hash, order_index, original_url) VALUES (?, ?, ?, ?, ?)',
      );
      photos.forEach((p, i) => ins.run(createId(), adId, p.hash, i, p.originalUrl ?? null));
    });
    tx();
  },

  findByAdId(adId: string): AdPhoto[] {
    const rows = getDb()
      .prepare('SELECT * FROM ad_photos WHERE ad_id = ? ORDER BY order_index')
      .all(adId) as PhotoRow[];
    return rows.map(rowToPhoto);
  },

  setForDraft(draftId: string, hashes: string[]): void {
    const tx = getDb().transaction(() => {
      getDb().prepare('DELETE FROM draft_photos WHERE draft_id = ?').run(draftId);
      const ins = getDb().prepare(
        'INSERT INTO draft_photos (id, draft_id, photo_hash, order_index) VALUES (?, ?, ?, ?)',
      );
      hashes.forEach((h, i) => ins.run(createId(), draftId, h, i));
    });
    tx();
  },

  findByDraftId(draftId: string): string[] {
    const rows = getDb()
      .prepare('SELECT photo_hash FROM draft_photos WHERE draft_id = ? ORDER BY order_index')
      .all(draftId) as Array<{ photo_hash: string }>;
    return rows.map((r) => r.photo_hash);
  },

  /** Return hashes that are no longer referenced anywhere — candidates for disk cleanup. */
  unreferencedHashes(): string[] {
    const rows = getDb()
      .prepare(
        `SELECT DISTINCT photo_hash FROM ad_photos
         WHERE photo_hash NOT IN (SELECT photo_hash FROM ad_photos)
            AND photo_hash NOT IN (SELECT photo_hash FROM draft_photos)`,
      )
      .all() as Array<{ photo_hash: string }>;
    return rows.map((r) => r.photo_hash);
  },
};
