/**
 * Images (`[ Plans ]/04-DATA-PIPELINE.md` "Images"): batched `imageinfo`, download through the
 * polite client, convert with sharp, record `{ path: sha1 }` in `public/images/manifest.json`.
 *
 * - Sources of 64 px or less are pixel art: upscaled ×4 with the nearest-neighbour kernel and
 *   stored lossless, so they stay crisp.
 * - Larger sources (covers, screenshots) are WebP quality 90, at most 640 px wide.
 * - A file is skipped when it exists and its sha1 matches the manifest. Without `download`, no
 *   request is made: existing files are measured and missing ones are reported (offline runs).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getImageInfo, type WikiClient } from '../wiki/client';

export interface ImageJob {
  id: string;
  game: string;
  category: string;
  slug: string;
  name: string;
  /** Wiki file title, `File:MCD Claymore.png`. */
  file: string;
}

interface ImageResult {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface MissingImage {
  id: string;
  file: string;
  reason: string;
}

export interface ImageSyncResult {
  images: Map<string, ImageResult>;
  missing: MissingImage[];
  downloaded: number;
  unchanged: number;
}

const PIXEL_MAX = 64;
const PIXEL_SCALE = 4;
const PHOTO_MAX_WIDTH = 640;

/** Converts one source image to the stored WebP. */
export async function toWebp(
  input: Buffer,
): Promise<{ data: Buffer; width: number; height: number }> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;
  if (!width || !height) throw new Error('image has no size');
  const pixelArt = width <= PIXEL_MAX && height <= PIXEL_MAX;
  let pipeline = sharp(input);
  if (pixelArt) {
    pipeline = pipeline
      .resize(width * PIXEL_SCALE, height * PIXEL_SCALE, { kernel: 'nearest' })
      .webp({ lossless: true });
  } else {
    if (width > PHOTO_MAX_WIDTH) pipeline = pipeline.resize({ width: PHOTO_MAX_WIDTH });
    pipeline = pipeline.webp({ quality: 90 });
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function readManifest(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
}

function writeManifest(file: string, manifest: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => (a < b ? -1 : 1)));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

export const imageSrc = (job: Pick<ImageJob, 'game' | 'category' | 'slug'>) =>
  `/images/${job.game}/${job.category}/${job.slug}.webp`;

export async function syncImages(
  jobs: readonly ImageJob[],
  opts: { client: WikiClient; publicDir: string; download: boolean; log: (m: string) => void },
): Promise<ImageSyncResult> {
  const manifestFile = path.join(opts.publicDir, 'images', 'manifest.json');
  const manifest = readManifest(manifestFile);
  const result: ImageSyncResult = { images: new Map(), missing: [], downloaded: 0, unchanged: 0 };
  const info = opts.download
    ? await getImageInfo([...new Set(jobs.map((j) => j.file))], opts.client)
    : undefined;
  const buffers = new Map<string, Buffer>();
  let done = 0;

  for (const job of jobs) {
    const src = imageSrc(job);
    const dest = path.join(opts.publicDir, src.slice(1));
    const alt = `${job.name} icon`;
    const remote = info?.get(job.file);

    if (info) {
      if (!remote || remote.missing || !remote.url) {
        result.missing.push({ id: job.id, file: job.file, reason: 'file not found on the wiki' });
        continue;
      }
      const upToDate = existsSync(dest) && manifest[src] === remote.sha1;
      if (!upToDate) {
        let source = buffers.get(job.file);
        if (!source) {
          source = await opts.client.getBinary(remote.url);
          buffers.set(job.file, source);
        }
        const converted = await toWebp(source);
        mkdirSync(path.dirname(dest), { recursive: true });
        writeFileSync(dest, converted.data);
        if (remote.sha1) manifest[src] = remote.sha1;
        result.downloaded++;
        // Save progress, so an interrupted run does not download everything again.
        if (result.downloaded % 25 === 0) writeManifest(manifestFile, manifest);
      } else {
        result.unchanged++;
      }
    } else if (!existsSync(dest)) {
      result.missing.push({ id: job.id, file: job.file, reason: 'not downloaded yet' });
      continue;
    } else {
      result.unchanged++;
    }

    const meta = await sharp(dest).metadata();
    if (!meta.width || !meta.height) {
      result.missing.push({ id: job.id, file: job.file, reason: 'stored image is unreadable' });
      continue;
    }
    result.images.set(job.id, { src, width: meta.width, height: meta.height, alt });
    if (++done % 100 === 0) opts.log(`images: ${done}/${jobs.length}`);
  }

  if (opts.download) {
    const removed = pruneOrphans(opts.publicDir, jobs, manifest);
    if (removed.length) opts.log(`images: removed ${removed.length} file(s) no entity uses`);
    writeManifest(manifestFile, manifest);
  }
  return result;
}

/**
 * Deletes images (and their manifest entries) in the synced categories' folders that no entity
 * points at any more, e.g. after a parser stops listing an unused item.
 */
export function pruneOrphans(
  publicDir: string,
  jobs: readonly Pick<ImageJob, 'game' | 'category' | 'slug'>[],
  manifest: Record<string, string>,
): string[] {
  const keep = new Set(jobs.map(imageSrc));
  const folders = new Set(jobs.map((j) => `${j.game}/${j.category}`));
  const removed: string[] = [];
  for (const folder of [...folders].sort()) {
    const dir = path.join(publicDir, 'images', folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.webp'))) {
      const src = `/images/${folder}/${file}`;
      if (keep.has(src)) continue;
      rmSync(path.join(dir, file));
      Reflect.deleteProperty(manifest, src);
      removed.push(src);
    }
  }
  return removed;
}
