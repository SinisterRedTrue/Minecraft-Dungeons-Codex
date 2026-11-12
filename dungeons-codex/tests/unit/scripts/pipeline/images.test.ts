// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  imageSrc,
  pruneOrphans,
  syncImages,
  toWebp,
  type ImageJob,
} from '../../../../scripts/pipeline/images';
import { fakeClient, type FakeFile } from '../parsers/fakeWiki';

const png = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 1 } },
  })
    .png()
    .toBuffer();

const dims = async (data: Buffer) => {
  const meta = await sharp(data).metadata();
  return { format: meta.format, width: meta.width, height: meta.height };
};

describe('toWebp', () => {
  it('upscales pixel art (64 px or less) four times with nearest-neighbour', async () => {
    const out = await toWebp(await png(16, 16));
    expect(await dims(out.data)).toEqual({ format: 'webp', width: 64, height: 64 });
    expect({ w: out.width, h: out.height }).toEqual({ w: 64, h: 64 });
  });

  it('keeps larger images as they are, and caps very wide ones at 640 px', async () => {
    expect(await dims((await toWebp(await png(100, 80))).data)).toEqual({
      format: 'webp',
      width: 100,
      height: 80,
    });
    const wide = await toWebp(await png(1280, 400));
    expect({ w: wide.width, h: wide.height }).toEqual({ w: 640, h: 200 });
  });

  it('keeps the exact pixels of upscaled pixel art (lossless)', async () => {
    const source = await sharp({
      create: { width: 2, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 255 } },
          })
            .png()
            .toBuffer(),
          left: 1,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
    const { data } = await toWebp(source);
    const raw = await sharp(data).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(raw.info.width).toBe(8);
    const at = (x: number) => [...raw.data.subarray(x * 3, x * 3 + 3)];
    expect(at(0)).toEqual([255, 0, 0]);
    expect(at(3)).toEqual([255, 0, 0]);
    expect(at(4)).toEqual([0, 0, 255]);
    expect(at(7)).toEqual([0, 0, 255]);
  });
});

describe('syncImages', () => {
  const job = (slug: string, file: string): ImageJob => ({
    id: `d1:weapons:${slug}`,
    game: 'd1',
    category: 'weapons',
    slug,
    name: slug.replace('-', ' '),
    file,
  });

  async function setup() {
    const files: FakeFile[] = [
      { title: 'File:A.png', data: await png(16, 16), sha1: 'aaa', width: 16, height: 16 },
      { title: 'File:B.png', data: await png(32, 32), sha1: 'bbb', width: 32, height: 32 },
    ];
    const publicDir = mkdtempSync(path.join(os.tmpdir(), 'codex-images-'));
    return { files, publicDir };
  }

  it('downloads, converts, records the manifest, and sets alt text', async () => {
    const { files, publicDir } = await setup();
    const client = fakeClient([], files);
    const jobs = [job('claymore', 'File:A.png'), job('katana', 'File:B.png')];
    const result = await syncImages(jobs, { client, publicDir, download: true, log: () => {} });

    expect(result.downloaded).toBe(2);
    expect(result.missing).toEqual([]);
    expect(result.images.get('d1:weapons:claymore')).toEqual({
      src: '/images/d1/weapons/claymore.webp',
      width: 64,
      height: 64,
      alt: 'claymore icon',
    });
    expect(existsSync(path.join(publicDir, 'images', 'd1', 'weapons', 'katana.webp'))).toBe(true);
    const manifest = JSON.parse(
      readFileSync(path.join(publicDir, 'images', 'manifest.json'), 'utf8'),
    );
    expect(manifest).toEqual({
      '/images/d1/weapons/claymore.webp': 'aaa',
      '/images/d1/weapons/katana.webp': 'bbb',
    });
  });

  it('skips files whose sha1 is unchanged, and downloads shared files once', async () => {
    const { files, publicDir } = await setup();
    const jobs = [job('one', 'File:A.png'), job('two', 'File:A.png')];
    const first = fakeClient([], files);
    const a = await syncImages(jobs, { client: first, publicDir, download: true, log: () => {} });
    expect(a.downloaded).toBe(2);
    expect(first.requestCount).toBe(2); // one imageinfo batch + one download

    const second = fakeClient([], files);
    const b = await syncImages(jobs, { client: second, publicDir, download: true, log: () => {} });
    expect(b.downloaded).toBe(0);
    expect(b.unchanged).toBe(2);
    expect(second.requestCount).toBe(1); // imageinfo only
  });

  it('reports files the wiki does not have', async () => {
    const { files, publicDir } = await setup();
    const result = await syncImages([job('ghost', 'File:Nope.png')], {
      client: fakeClient([], files),
      publicDir,
      download: true,
      log: () => {},
    });
    expect(result.missing).toEqual([
      { id: 'd1:weapons:ghost', file: 'File:Nope.png', reason: 'file not found on the wiki' },
    ]);
  });

  it('without download it only measures files that already exist', async () => {
    const { files, publicDir } = await setup();
    const jobs = [job('claymore', 'File:A.png')];
    await syncImages(jobs, {
      client: fakeClient([], files),
      publicDir,
      download: true,
      log: () => {},
    });

    const offline = fakeClient([], files);
    const result = await syncImages([...jobs, job('later', 'File:B.png')], {
      client: offline,
      publicDir,
      download: false,
      log: () => {},
    });
    expect(offline.requestCount).toBe(0);
    expect(result.images.get('d1:weapons:claymore')?.width).toBe(64);
    expect(result.missing).toEqual([
      { id: 'd1:weapons:later', file: 'File:B.png', reason: 'not downloaded yet' },
    ]);
  });
});

describe('imageSrc', () => {
  it('uses game, category and slug', () => {
    expect(imageSrc({ game: 'd1', category: 'mobs', slug: 'cow' })).toBe(
      '/images/d1/mobs/cow.webp',
    );
  });
});

describe('pruneOrphans', () => {
  it('removes images in the synced folders that no entity uses, and their manifest entries', () => {
    const publicDir = mkdtempSync(path.join(os.tmpdir(), 'codex-orphans-'));
    const weapons = path.join(publicDir, 'images', 'd1', 'weapons');
    const armor = path.join(publicDir, 'images', 'd1', 'armor');
    mkdirSync(weapons, { recursive: true });
    mkdirSync(armor, { recursive: true });
    for (const file of ['claymore.webp', 'spider-crossbow.webp'])
      writeFileSync(path.join(weapons, file), 'x');
    writeFileSync(path.join(armor, 'battle-robe.webp'), 'x');
    const manifest: Record<string, string> = {
      '/images/d1/weapons/claymore.webp': 'a',
      '/images/d1/weapons/spider-crossbow.webp': 'b',
      '/images/d1/armor/battle-robe.webp': 'c',
    };

    const removed = pruneOrphans(
      publicDir,
      [{ game: 'd1', category: 'weapons', slug: 'claymore' }],
      manifest,
    );
    expect(removed).toEqual(['/images/d1/weapons/spider-crossbow.webp']);
    expect(existsSync(path.join(weapons, 'spider-crossbow.webp'))).toBe(false);
    expect(existsSync(path.join(weapons, 'claymore.webp'))).toBe(true);
    // Categories that were not synced are left alone.
    expect(existsSync(path.join(armor, 'battle-robe.webp'))).toBe(true);
    expect(Object.keys(manifest)).toEqual([
      '/images/d1/weapons/claymore.webp',
      '/images/d1/armor/battle-robe.webp',
    ]);
  });
});
