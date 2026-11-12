/**
 * Saves trimmed, real wiki responses to `tests/fixtures/wiki/` for the parser tests.
 * Run: `npx tsx scripts/dev/save-fixtures.ts` (uses the raw cache; add `--refresh` to re-fetch).
 *
 * HTML pages lose navboxes, galleries, references and bulky image attributes (srcset, styles);
 * when a page is still over the size budget, its wikitables keep their header rows, the rows
 * named in `keep`, and as many leading rows as fit. Table structure and cell content are untouched.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import {
  WikiClient,
  clientOptionsFromArgv,
  getWikitextBatch,
  pageUrl,
  parsePageHtml,
} from '../wiki/client';

const OUT_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'wiki');
const MAX_BYTES = 190_000;

interface HtmlFixture {
  file: string;
  title: string;
  keep?: string[];
}

const HTML_FIXTURES: HtmlFixture[] = [
  {
    file: 'd1-weapon-list.html',
    title: 'Dungeons:Weapon',
    keep: ['Claymore', 'Katana', 'Heartstealer', 'Broadsword', 'Hunting Bow', "Hunter's Promise"],
  },
  {
    file: 'd1-armor-list.html',
    title: 'Dungeons:Armor',
    keep: ["Champion's Armor", "Hero's Armor"],
  },
  { file: 'd2-weapon-list.html', title: 'Dungeons II:Weapon' },
  { file: 'd2-talisman-list.html', title: 'Dungeons II:Talisman' },
  { file: 'd1-claymore.html', title: 'Dungeons:Claymore' },
  { file: 'd1-katana.html', title: 'Dungeons:Katana' },
  { file: 'd1-hunting-bow.html', title: 'Dungeons:Hunting Bow' },
  { file: 'd1-champions-armor.html', title: "Dungeons:Champion's Armor" },
];

const WIKITEXT_FIXTURES: { file: string; title: string }[] = [
  { file: 'template-infobox-dungeons-item.wiki', title: 'Template:Infobox Dungeons item' },
  { file: 'template-infobox-dungeons-item-doc.wiki', title: 'Template:Infobox Dungeons item/doc' },
  { file: 'd1-claymore.wiki', title: 'Dungeons:Claymore' },
  { file: 'd1-katana.wiki', title: 'Dungeons:Katana' },
  { file: 'd1-hunting-bow.wiki', title: 'Dungeons:Hunting Bow' },
  { file: 'd1-champions-armor.wiki', title: "Dungeons:Champion's Armor" },
  { file: 'd1-heartstealer.wiki', title: 'Dungeons:Heartstealer' },
];

const REMOVE_SELECTORS = [
  'table.navbox',
  'div.navbox',
  '.mw-editsection',
  '#toc',
  '.toc',
  'ul.gallery',
  '.mw-references-wrap',
  'ol.references',
  'style',
  'link',
  'meta',
  '.mw-empty-elt',
];

function stripPage($: cheerio.CheerioAPI): void {
  $(REMOVE_SELECTORS.join(',')).remove();
  $('img').each((_, img) => {
    for (const attr of ['srcset', 'decoding', 'loading', 'class', 'alt']) $(img).removeAttr(attr);
  });
  // Styles are bulk, except the ones that hide text (the table parser must still see those).
  $('[style]').each((_, el) => {
    if (!/display\s*:\s*none/i.test($(el).attr('style') ?? '')) $(el).removeAttr('style');
  });
  // HTML comments (parser report, cache keys) are noise.
  $('*')
    .contents()
    .filter((_, node) => node.type === 'comment')
    .remove();
}

/** Trims every wikitable to its header rows + kept rows + the first `lead` data rows. */
function trimTables($: cheerio.CheerioAPI, keep: string[], lead: number): void {
  $('table.wikitable').each((_, table) => {
    const rows = $(table).find('> tbody > tr, > tr').toArray();
    let dataIndex = 0;
    for (const row of rows as Element[]) {
      const isHeader = $(row).children('td').length === 0;
      if (isHeader) continue;
      const text = $(row).text();
      const kept = keep.some((name) => text.includes(name));
      if (!kept && dataIndex >= lead) $(row).remove();
      dataIndex++;
    }
  });
}

function bodyHtml($: cheerio.CheerioAPI): string {
  const root = $('.mw-parser-output').first();
  return (root.length ? $.html(root as cheerio.Cheerio<AnyNode>) : $.html()).trim() + '\n';
}

async function main() {
  const client = new WikiClient({ ...clientOptionsFromArgv(), log: console.log });
  mkdirSync(OUT_DIR, { recursive: true });
  const index: Record<string, unknown>[] = [];

  for (const fx of HTML_FIXTURES) {
    const page = await parsePageHtml(fx.title, client);
    let html = '';
    for (let lead = 1000; lead >= 0; lead = lead > 20 ? 20 : lead - 2) {
      const $ = cheerio.load(page.html);
      stripPage($);
      trimTables($, fx.keep ?? [], lead);
      html = bodyHtml($);
      if (Buffer.byteLength(html) <= MAX_BYTES) break;
    }
    const bytes = Buffer.byteLength(html);
    if (bytes > MAX_BYTES) throw new Error(`${fx.file} is still ${bytes} bytes`);
    writeFileSync(path.join(OUT_DIR, fx.file), html, 'utf8');
    index.push({
      file: fx.file,
      title: page.title,
      url: pageUrl(page.title),
      revisionId: page.revisionId,
      fetchedAt: page.fetchedAt,
      kind: 'html',
      bytes,
    });
    console.log(`${fx.file}: ${bytes} bytes`);
  }

  const pages = await getWikitextBatch(
    WIKITEXT_FIXTURES.map((f) => f.title),
    client,
  );
  for (const fx of WIKITEXT_FIXTURES) {
    const page = pages.get(fx.title);
    if (!page?.wikitext) throw new Error(`Missing wikitext for ${fx.title}`);
    writeFileSync(path.join(OUT_DIR, fx.file), page.wikitext, 'utf8');
    index.push({
      file: fx.file,
      title: page.title,
      url: pageUrl(page.title),
      revisionId: page.revisionId,
      fetchedAt: page.fetchedAt,
      kind: 'wikitext',
      bytes: Buffer.byteLength(page.wikitext),
    });
    console.log(`${fx.file}: ${Buffer.byteLength(page.wikitext)} bytes`);
  }

  writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`requests sent: ${client.requestCount}`);
}

void main();
