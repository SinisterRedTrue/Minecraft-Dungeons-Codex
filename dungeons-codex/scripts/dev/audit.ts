/**
 * Data audit (Prompt 13): a seeded sample of entities per game, checked field by field against
 * the *live* wiki page (a fresh fetch, not the sync cache). Every string and number the entity
 * holds must appear in the live page text. A miss is not always a bug (list-page columns, renamed
 * labels), so each one is printed for a human to judge, with the entity's own value.
 *
 *   npx tsx scripts/dev/audit.ts [seed] [count] [d1|d2|all]
 *
 * Entities that earlier spot checks already covered (the seeded 20261112 picks) are skipped.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { WikiClient, parsePageHtml } from '../wiki/client';
import { hashString, seededShuffle } from '../../src/lib/utils/seed';

type Game = 'd1' | 'd2';
type Entity = Record<string, unknown> & { id: string; name: string };

const CATEGORIES: Record<Game, string[]> = {
  d1: ['weapons', 'armor', 'enchantments', 'artifacts', 'dlcs', 'cosmetics', 'mobs', 'locations'],
  d2: ['weapons', 'armor', 'enchantments', 'artifacts', 'talismans', 'quests', 'mobs', 'locations'],
};

/** Derived, structural or id-like fields: not wiki facts, so not compared. */
const SKIP = new Set([
  'id',
  'slug',
  'game',
  'category',
  'image',
  'source',
  'quality',
  'tags',
  'related',
  'variantIds',
  'baseItemId',
  'locationIds',
  'itemIds',
  'builtInto',
  'contentCounts',
  'powerTable',
  'hiddenUntilOn',
  'kind',
]);

const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function* leaves(value: unknown, field: string): Generator<[string, string | number]> {
  if (typeof value === 'string' || typeof value === 'number') yield [field, value];
  else if (Array.isArray(value)) for (const v of value) yield* leaves(v, field);
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) if (!SKIP.has(k)) yield* leaves(v, `${field}.${k}`);
}

function present(text: string, value: string | number): boolean {
  if (typeof value === 'number') {
    const digits = String(value);
    return new RegExp(`(^|[^0-9.])${digits.replace('.', '\\.')}([^0-9]|\\.(?![0-9])|$)`).test(text);
  }
  let needle = norm(value).replace(/^d[12]:[a-z]+:/, '');
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(needle);
  if (iso) {
    const [, year = '', month = '1', day = '1'] = iso;
    const name = new Date(Date.UTC(Number(year), Number(month) - 1, 1))
      .toLocaleString('en', { month: 'long', timeZone: 'UTC' })
      .toLowerCase();
    return (
      text.includes(`${name} ${Number(day)}, ${year}`) ||
      text.includes(`${Number(day)} ${name} ${year}`)
    );
  }
  if (needle === '') return true;
  // Slug-like values (ids of linked entities) are compared as words.
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(needle)) needle = needle.replace(/-/g, ' ');
  if (text.includes(needle)) return true;
  // Camel/enum values such as "meleeWeapon" or "wing_guard": compare spaced words too.
  const spaced = needle.replace(/[_-]/g, ' ');
  if (text.includes(spaced)) return true;
  // Long prose: the first 60 characters are enough to prove it is the page's text.
  return needle.length > 80 && text.includes(needle.slice(0, 60));
}

function earlierPicks(game: Game): Set<string> {
  // spotcheck.ts used mulberry32(20261112) with its own (non-hashed) seed; reproduce it.
  let a = 20261112;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cats: Record<Game, string[]> = {
    d1: [
      'weapons',
      'weapons',
      'armor',
      'enchantments',
      'artifacts',
      'dlcs',
      'cosmetics',
      'mobs',
      'mobs',
      'locations',
    ],
    d2: [
      'weapons',
      'weapons',
      'armor',
      'armor',
      'enchantments',
      'artifacts',
      'talismans',
      'quests',
      'mobs',
      'locations',
    ],
  };
  const out = new Set<string>();
  for (const category of cats[game]) {
    const list = JSON.parse(
      readFileSync(path.join(process.cwd(), 'data', 'generated', game, `${category}.json`), 'utf8'),
    ) as Entity[];
    const picked = list[Math.floor(next() * list.length)];
    if (picked) out.add(picked.id);
  }
  return out;
}

async function main() {
  const seed = process.argv[2] ?? 'audit-20261113';
  const count = Number(process.argv[3] ?? 20);
  const games: Game[] =
    process.argv[4] === 'd1' || process.argv[4] === 'd2' ? [process.argv[4]] : ['d1', 'd2'];
  const client = new WikiClient({
    refresh: true,
    cacheDir: mkdtempSync(path.join(os.tmpdir(), 'dc-audit-')),
  });
  let total = 0;
  let clean = 0;
  for (const game of games) {
    const skip = earlierPicks(game);
    const cats = CATEGORIES[game];
    // 20 = two per category, then one more for the largest ones.
    const plan = Array.from({ length: count }, (_, i) => cats[i % cats.length] as string);
    const taken = new Set<string>();
    console.log(`\n######## ${game} ########`);
    for (const [i, category] of plan.entries()) {
      const list = JSON.parse(
        readFileSync(
          path.join(process.cwd(), 'data', 'generated', game, `${category}.json`),
          'utf8',
        ),
      ) as Entity[];
      const entity = seededShuffle(
        list,
        `${seed}:${game}:${category}:${hashString(String(i))}`,
      ).find((e) => !skip.has(e.id) && !taken.has(e.id));
      if (!entity) continue;
      taken.add(entity.id);
      const sourceTitle = (entity.source as { title: string }).title;
      const page = await parsePageHtml(sourceTitle, client);
      const $ = cheerio.load(page.html);
      $('style, script, .mw-editsection, sup.reference').remove();
      const text = norm($.root().text());
      const checks = [...leaves(entity, 'entity')].filter(
        ([f]) => !SKIP.has(f.split('.')[1] ?? ''),
      );
      const missing = checks.filter(([, v]) => !present(text, v));
      total += 1;
      if (missing.length === 0) clean += 1;
      const rev = (entity.source as { revisionId: number }).revisionId;
      console.log(
        `\n[${i + 1}] ${game}/${category}/${entity.id} "${entity.name}"  checked ${checks.length}, missing ${missing.length}  (synced rev ${rev}, live ${page.revisionId}${rev === page.revisionId ? '' : ' CHANGED'})`,
      );
      for (const [field, value] of missing) {
        console.log(`    - ${field}: ${JSON.stringify(value).slice(0, 140)}`);
      }
    }
  }
  console.log(`\n${clean}/${total} entities had every field present on the live page`);
}

void main();
