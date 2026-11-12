/**
 * First-load JavaScript per page, measured the way a browser loads it: every `<script src>` a
 * page's HTML references (the `nomodule` polyfill is skipped), gzipped. Next 16 no longer prints
 * these sizes in `next build`, so this is how the budgets in `[ Plans ]/08-QUALITY-STANDARDS.md`
 * are checked.
 *
 *   npm run build && npm run start -- -p 3100      # in one terminal
 *   npx tsx scripts/dev/bundle-size.ts http://localhost:3100 / /d1/weapons /d2/armor
 *   npx tsx scripts/dev/bundle-size.ts http://localhost:3100 --check       # the budget pages, exit 1 over
 *
 * Budgets (D-101): the original 120 / 180 kB targets sit below the framework floor (React DOM 70 +
 * the Next client runtime 55 = about 129 kB gzip before any app code), so the enforced numbers
 * are the measured ones plus headroom.
 */
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const check = args.includes('--check');
const [base = 'http://localhost:3100', ...given] = args.filter((a) => a !== '--check');

/** First-load JS budgets in kB gzip, per page template (D-101). */
const BUDGETS: Record<string, number> = {
  '/': 205,
  '/d1': 205,
  '/d1/weapons': 240,
  '/d2/armor': 240,
  '/d1/weapons/claymore': 215,
  '/d2/quests/breaking-camps': 215,
  '/d1/compare': 230,
  '/favorites': 260,
  '/d1/planner': 300,
  '/about': 205,
};
const pages =
  given.length > 0 ? given : check ? Object.keys(BUDGETS) : ['/', '/d1/weapons', '/d2/armor'];
let over = 0;
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
    const budget = BUDGETS[path];
    const kb = total / 1024;
    if (check && budget !== undefined && kb > budget) over += 1;
    console.log(
      `${path.padEnd(28)} ${kb.toFixed(1).padStart(6)} kB gzip${budget === undefined ? '' : ` (budget ${budget})`}   ` +
        `${scripts.length} scripts   html ${(html.length / 1024).toFixed(0)} kB ` +
        `(${(gzipSync(Buffer.from(html)).length / 1024).toFixed(0)} kB gzip)`,
    );
  }
}

void main().then(() => {
  if (over > 0) {
    console.error(`
${over} page(s) over budget`);
    process.exit(1);
  }
});
