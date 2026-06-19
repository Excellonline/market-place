import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';
import { paths } from '../paths';
import { logger } from '../logger';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function extFromUrl(url: string): string {
  const u = url.split('?')[0]!.split('#')[0]!;
  const m = u.match(/\.(jpe?g|png|webp|gif)$/i);
  return m ? m[1]!.toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

/**
 * Download a photo via the page's network context (preserves cookies/referer/CDN auth)
 * and store it content-addressed by sha256.
 */
export async function fetchPhoto(page: Page, url: string): Promise<{ hash: string; ext: string; filePath: string } | null> {
  try {
    const response = await page.request.get(url, { failOnStatusCode: false, maxRedirects: 5 });
    if (!response.ok()) {
      logger().warn({ url, status: response.status() }, 'photo fetch failed');
      return null;
    }
    const buf = await response.body();
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const mime = response.headers()['content-type']?.split(';')[0]?.trim() ?? '';
    const ext = EXT_BY_MIME[mime] ?? extFromUrl(url);
    const dest = paths.photoFile(hash, ext);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, buf);
    }
    return { hash, ext, filePath: dest };
  } catch (err) {
    logger().warn({ err, url }, 'photo fetch threw');
    return null;
  }
}

/** Resolve a hash to the file on disk by extension probe (we don't track ext in DB). */
export function pathForHash(hash: string): string | null {
  for (const ext of ['jpg', 'png', 'webp', 'gif']) {
    const p = path.join(paths.photos, `${hash}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
