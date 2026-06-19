import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpRoot = path.join(os.tmpdir(), 'marketplace-photo-test-' + Math.random().toString(36).slice(2));

vi.mock('electron', () => ({
  app: {
    getPath: (n: string) => {
      if (n === 'userData') return tmpRoot;
      return '/tmp';
    },
  },
}));

import { storeBytes, importLocalFile, resolvePhotoPath } from '../../src/main/photos/store';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

function makeBuf(magic: Buffer, sizeBytes: number): Buffer {
  const buf = Buffer.alloc(sizeBytes);
  magic.copy(buf, 0);
  for (let i = magic.length; i < sizeBytes; i++) buf[i] = i % 256;
  return buf;
}

describe('photo store', () => {
  beforeEach(() => {
    fs.mkdirSync(tmpRoot, { recursive: true });
    // paths.ts is cached after first access — make sure the photos subdir exists every run
    fs.mkdirSync(path.join(tmpRoot, 'photos'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'logs'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'profiles'), { recursive: true });
  });
  afterEach(() => {
    // Just clear photos contents, leave the subdir so the cached Proxy stays valid.
    const photosDir = path.join(tmpRoot, 'photos');
    if (fs.existsSync(photosDir)) {
      for (const f of fs.readdirSync(photosDir)) {
        fs.rmSync(path.join(photosDir, f), { recursive: true, force: true });
      }
    }
  });

  it('storeBytes detects png magic and writes a .png file', () => {
    const r = storeBytes(makeBuf(PNG_MAGIC, 64));
    expect(r.ext).toBe('png');
    expect(r.storedPath.endsWith('.png')).toBe(true);
    expect(fs.existsSync(r.storedPath)).toBe(true);
  });

  it('storeBytes detects jpg magic', () => {
    const r = storeBytes(makeBuf(JPG_MAGIC, 64));
    expect(r.ext).toBe('jpg');
    expect(r.storedPath.endsWith('.jpg')).toBe(true);
  });

  it('storeBytes detects gif magic', () => {
    const r = storeBytes(makeBuf(GIF_MAGIC, 64));
    expect(r.ext).toBe('gif');
  });

  it('storeBytes is content-addressed: same bytes → same path', () => {
    const buf = makeBuf(PNG_MAGIC, 100);
    const a = storeBytes(buf);
    const b = storeBytes(Buffer.from(buf)); // identical bytes
    expect(a.hash).toBe(b.hash);
    expect(a.storedPath).toBe(b.storedPath);
  });

  it('different bytes → different hash', () => {
    const a = storeBytes(makeBuf(PNG_MAGIC, 100));
    const b = storeBytes(makeBuf(PNG_MAGIC, 101));
    expect(a.hash).not.toBe(b.hash);
  });

  it('resolvePhotoPath returns null for unknown hash', () => {
    expect(resolvePhotoPath('00000000000000000000000000000000000000000000000000000000deadbeef')).toBeNull();
  });

  it('resolvePhotoPath finds stored photos', () => {
    const r = storeBytes(makeBuf(PNG_MAGIC, 64));
    expect(resolvePhotoPath(r.hash)).toBe(r.storedPath);
  });

  it('importLocalFile reads from disk and hashes the bytes', () => {
    const src = path.join(tmpRoot, 'src.png');
    fs.writeFileSync(src, makeBuf(PNG_MAGIC, 64));
    const r = importLocalFile(src);
    expect(r.ext).toBe('png');
    expect(fs.existsSync(r.storedPath)).toBe(true);
    expect(r.hash).toHaveLength(64);
  });
});
