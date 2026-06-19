import { z } from 'zod';
import { PLATFORM_IDS } from '../types/platform';

const perPlatformSchema = z.object({
  enabled: z.boolean(),
  category: z.string().nullable(),
  categoryPath: z.array(z.string()).nullable(),
  condition: z.string().nullable(),
  priceOverrideCents: z.number().int().nonnegative().nullable(),
  locationRadiusKm: z.number().int().positive().nullable(),
});

export const adDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().min(1, 'Description is required').max(8000),
  priceCents: z.number().int().nonnegative().nullable(),
  currency: z.string().default('CAD'),
  perPlatform: z.object(
    Object.fromEntries(PLATFORM_IDS.map((p) => [p, perPlatformSchema])) as Record<typeof PLATFORM_IDS[number], typeof perPlatformSchema>,
  ),
  photoHashes: z.array(z.string()).max(10, 'At most 10 photos'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ParsedDraft = z.infer<typeof adDraftSchema>;

export const publishDraftSchema = z.object({
  draftId: z.string().min(1),
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1),
});
