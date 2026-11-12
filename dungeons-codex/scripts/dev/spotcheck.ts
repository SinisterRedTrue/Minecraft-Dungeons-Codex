/**
 * Prints 10 randomly chosen D1 entities (seeded, so the pick is repeatable) next to the text of
 * their live wiki page, for the field-by-field spot check of Prompt 04 task 9.
 * Run: `npx tsx scripts/dev/spotcheck.ts [seed]`
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { getClient, parsePageHtml } from '../wiki/client';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = [
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
];

const HIDE = ['source', 'related', 'image', 'powerTable', 'tags', 'id', 'game', 'quality'];

async function main() {
  const random = mulberry32(Number(process.argv[2] ?? 20261112));
  const client = getClient();
  for (const category of CATEGORIES) {
    const file = path.join(process.cwd(), 'data', 'generated', 'd1', `${category}.json`);
    const list = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>[];
    const entity = list[Math.floor(random() * list.length)];
    if (!entity) continue;
    const shown: Record<string, unknown> = Object.fromEntries(
      Object.entries(entity).filter(([key]) => !HIDE.includes(key)),
    );
    if (Array.isArray(entity.powerTable)) shown.powerTable = `${entity.powerTable.length} rows`;
    console.log(`\n=== ${String(entity.id)} ===`);
    console.log(JSON.stringify(shown));
    const source = entity.source as { title: string; revisionId: number };
    const page = await parsePageHtml(source.title, client);
    const $ = cheerio.load(page.html);
    $('style, script, .mw-editsection, sup.reference').remove();
    const infobox = $('.infobox').first().text().replace(/\s+/g, ' ').trim();
    const lead = $('.mw-parser-output > p').first().text().replace(/\s+/g, ' ').trim();
    console.log(
      `--- live ${page.title} (revision ${page.revisionId}; synced ${source.revisionId})`,
    );
    console.log(`infobox: ${infobox.slice(0, 700)}`);
    console.log(`lead: ${lead.slice(0, 400)}`);
    // Entities that come from a list page: show the table row that names them.
    const name = String(entity.name);
    const row = $('table.wikitable tr')
      .toArray()
      .map((tr) => $(tr).text().replace(/\s+/g, ' ').trim())
      .find((text) => text.includes(name));
    if (row) console.log(`row: ${row.slice(0, 900)}`);
  }
}

void main();
