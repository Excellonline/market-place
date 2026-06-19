import { getDb } from '../index';
import { createId } from '../../ids';
import type { AdDraft } from '@shared/types/ad';
import { photosRepo } from './photos.repo';

interface DraftRow {
  id: string;
  title: string;
  description: string;
  price_cents: number | null;
  currency: string;
  per_platform: string;
  created_at: number;
  updated_at: number;
}

function rowToDraft(r: DraftRow, photoHashes: string[]): AdDraft {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    priceCents: r.price_cents,
    currency: r.currency,
    perPlatform: JSON.parse(r.per_platform),
    photoHashes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const draftsRepo = {
  save(draft: Omit<AdDraft, 'createdAt' | 'updatedAt'> & { id?: string }): AdDraft {
    const now = Date.now();
    const id = draft.id ?? createId();
    const existing = id ? draftsRepo.findById(id) : null;
    const tx = getDb().transaction(() => {
      if (existing) {
        getDb()
          .prepare(
            `UPDATE ad_drafts SET title=@title, description=@description, price_cents=@price_cents,
             currency=@currency, per_platform=@per_platform, updated_at=@updated_at WHERE id=@id`,
          )
          .run({
            id,
            title: draft.title,
            description: draft.description,
            price_cents: draft.priceCents,
            currency: draft.currency,
            per_platform: JSON.stringify(draft.perPlatform),
            updated_at: now,
          });
      } else {
        getDb()
          .prepare(
            `INSERT INTO ad_drafts (id, title, description, price_cents, currency, per_platform, created_at, updated_at)
             VALUES (@id, @title, @description, @price_cents, @currency, @per_platform, @created_at, @updated_at)`,
          )
          .run({
            id,
            title: draft.title,
            description: draft.description,
            price_cents: draft.priceCents,
            currency: draft.currency,
            per_platform: JSON.stringify(draft.perPlatform),
            created_at: now,
            updated_at: now,
          });
      }
      photosRepo.setForDraft(id, draft.photoHashes);
    });
    tx();
    return draftsRepo.findById(id)!;
  },

  findById(id: string): AdDraft | null {
    const row = getDb().prepare('SELECT * FROM ad_drafts WHERE id = ?').get(id) as DraftRow | undefined;
    if (!row) return null;
    return rowToDraft(row, photosRepo.findByDraftId(id));
  },

  list(): AdDraft[] {
    const rows = getDb().prepare('SELECT * FROM ad_drafts ORDER BY updated_at DESC').all() as DraftRow[];
    return rows.map((r) => rowToDraft(r, photosRepo.findByDraftId(r.id)));
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM ad_drafts WHERE id = ?').run(id);
  },
};
