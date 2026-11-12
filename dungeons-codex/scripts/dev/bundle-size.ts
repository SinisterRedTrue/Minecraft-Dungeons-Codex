/**
 * First-load JavaScript per page, measured the way a browser loads it: every `<script src>` a
 * page's HTML references (the `nomodule` polyfill is skipped), gzipped. Next 16 no longer prints
 * these sizes in `next build`, so this is how the budgets in `[ Plans ]/08-QUALITY-STANDARDS.md`
 * are checked.
 *
 *   npm run build && npm run start -- -p 3100      # in one terminal
 *   npx tsx scripts/dev/bundle-size.ts http://localhost:3100 / /d1/weapons /d2/armor
 */
import { gzipSync } from 'node:zlib';

const [base = 'http://localhost:3100', ...given] = process.argv.slice(2);
const pages = given.length > 0 ? given : ['/', '/d1/weapons', '/d2/armor'];
const chunks = new Map<string, number>();

async function gzipSize(url: string): Promise<number> {
  const known = chunks.get(url);
  if (known !== undefined) return known;
  const body = Buffer.from(await (await fetch(base + url)).arrayBuffer());
  const size = gzipSync(body).length;
  chunks.set(url, size);
  return size;
}

async function main(): Promise<void> {
  for (const path of pages) {
    const html = await (await fetch(base + path)).text();
    const scripts = [
      ...html.matchAll(/<script\b([^>]*)\bsrc="(\/_next\/static\/[^"]+\.js)"([^>]*)>/g),
    ]
      .filter(([, before = '', , after = '']) => !/no[Mm]odule/.test(`${before} ${after}`))
      .map(([, , src = '']) => src);
    const sizes = await Promise.all([...new Set(scripts)].map(gzipSize));
    const total = sizes.reduce((sum, size) => sum + size, 0);
    console.log(
      `${path.padEnd(22)} ${(total / 1024).toFixed(1).padStart(6)} kB gzip   ` +
        `${scripts.length} scripts   html ${(html.length / 1024).toFixed(0)} kB ` +
        `(${(gzipSync(Buffer.from(html)).length / 1024).toFixed(0)} kB gzip)`,
    );
  }
}

void main();
