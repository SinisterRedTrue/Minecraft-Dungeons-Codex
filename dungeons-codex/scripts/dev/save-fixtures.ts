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
  /** Keep the navbox whose title matches (everything else navbox-like is removed). */
  navbox?: RegExp;
  /** Rows to keep from `.mob-icon-list`s: only icons whose link title is listed survive. */
  mobs?: string[];
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
  {
    file: 'd1-enchantment-list.html',
    title: 'Dungeons:Enchantment',
    keep: ['Sharpness', 'Fire Aspect', 'Rushdown', 'Shadow Shot', 'Prospector'],
  },
  {
    file: 'd1-artifact-list.html',
    title: 'Dungeons:Artifact',
    keep: ['Corrupted Beacon', 'Fireworks Arrow', 'Updraft Tome', 'Blightbearer'],
  },
  { file: 'd1-dlc-list.html', title: 'Dungeons:DLC' },
  { file: 'd1-cosmetic-overview.html', title: 'Dungeons:Cosmetic' },
  { file: 'd1-cape-list.html', title: 'Dungeons:Cape', keep: ['Hero Cape', 'Hammer Cape'] },
  { file: 'd1-emote-list.html', title: 'Dungeons:Emote', keep: ['Dance Fever'] },
  { file: 'd1-flair-list.html', title: 'Dungeons:Flair', keep: ['Food Parcel', 'Confetti'] },
  { file: 'd1-hero-list.html', title: 'Dungeons:Hero', keep: ['Alex', 'Adriene'] },
  { file: 'd1-pet-list.html', title: 'Dungeons:Pet (cosmetic)', keep: ['Parrot', 'Small Spider'] },
  {
    file: 'd1-mob-list.html',
    title: 'Dungeons:Mob',
    mobs: [
      'Dungeons:Cow',
      'Dungeons:Creeper',
      'Dungeons:Zombie',
      'Dungeons:Husk',
      'Dungeons:Arch-Illager',
      'Dungeons:Abominable Weaver',
      'Dungeons:Redstone Golem',
    ],
  },
  { file: 'd1-location-list.html', title: 'Dungeons:Location', navbox: /locations/i },
  { file: 'd2-weapon-list.html', title: 'Dungeons II:Weapon' },
  {
    file: 'd2-armor-list.html',
    title: 'Dungeons II:Armor',
    keep: ['Beekeeper', 'Hivemind', 'Mystic Circlet', 'Oracle'],
  },
  { file: 'd2-enchantment-list.html', title: 'Dungeons II:Enchantment' },
  {
    file: 'd2-artifact-list.html',
    title: 'Dungeons II:Artifact',
    keep: ['Battle Banner', 'Totem of Regeneration', 'Powershaker'],
  },
  { file: 'd2-talisman-list.html', title: 'Dungeons II:Talisman' },
  {
    file: 'd2-quest-list.html',
    title: 'Dungeons II:Quest',
    keep: [
      'The Silence in Little Howl',
      'The Illagers from the Rift',
      'The Trembling Golem',
      'The Sculk Monstrosity Revived',
      'The Final Souldown Encore',
    ],
  },
  {
    file: 'd2-mob-list.html',
    title: 'Dungeons II:Mob',
    mobs: [
      'Dungeons II:Echo Golem',
      'Dungeons II:Cartographer',
      'Dungeons II:Blacksmith',
      'Dungeons II:Bee',
      'Dungeons II:Zombie',
      'Dungeons II:Evoker',
      'Dungeons II:Copper Monstrosity',
      'Dungeons II:Trill',
      'Dungeons II:Armadillo',
    ],
  },
  { file: 'd2-location-list.html', title: 'Dungeons II:Location' },
  { file: 'd1-claymore.html', title: 'Dungeons:Claymore' },
  { file: 'd1-katana.html', title: 'Dungeons:Katana' },
  { file: 'd1-hunting-bow.html', title: 'Dungeons:Hunting Bow' },
  { file: 'd1-champions-armor.html', title: "Dungeons:Champion's Armor" },
];

const WIKITEXT_FIXTURES: { file: string; title: string }[] = [
  { file: 'd1-corrupted-beacon.wiki', title: 'Dungeons:Corrupted Beacon' },
  { file: 'd1-updraft-tome.wiki', title: 'Dungeons:Updraft Tome' },
  { file: 'd1-arch-illager.wiki', title: 'Dungeons:Arch-Illager' },
  { file: 'd1-zombie.wiki', title: 'Dungeons:Zombie' },
  { file: 'd1-abominable-weaver.wiki', title: 'Dungeons:Abominable Weaver' },
  { file: 'd1-redstone-golem.wiki', title: 'Dungeons:Redstone Golem' },
  { file: 'd1-jungle-awakens.wiki', title: 'Dungeons:Jungle Awakens' },
  { file: 'd1-creeper.wiki', title: 'Dungeons:Creeper' },
  { file: 'd1-creeper-woods.wiki', title: 'Dungeons:Creeper Woods' },
  { file: 'd1-arch-haven.wiki', title: 'Dungeons:Arch Haven' },
  { file: 'template-infobox-dungeons-item.wiki', title: 'Template:Infobox Dungeons item' },
  { file: 'template-infobox-dungeons-item-doc.wiki', title: 'Template:Infobox Dungeons item/doc' },
  { file: 'd1-claymore.wiki', title: 'Dungeons:Claymore' },
  { file: 'd1-katana.wiki', title: 'Dungeons:Katana' },
  { file: 'd1-hunting-bow.wiki', title: 'Dungeons:Hunting Bow' },
  { file: 'd1-champions-armor.wiki', title: "Dungeons:Champion's Armor" },
  { file: 'd1-heartstealer.wiki', title: 'Dungeons:Heartstealer' },
  { file: 'd2-hunters-hatchet.wiki', title: "Dungeons II:Hunter's Hatchet" },
  { file: 'd2-bow.wiki', title: 'Dungeons II:Bow' },
  { file: 'd2-beekeeper-veil.wiki', title: 'Dungeons II:Beekeeper Veil' },
  { file: 'd2-zombie.wiki', title: 'Dungeons II:Zombie' },
  { file: 'd2-echo-golem.wiki', title: 'Dungeons II:Echo Golem' },
  { file: 'd2-howling-woods.wiki', title: 'Dungeons II:Howling Woods' },
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

function stripPage($: cheerio.CheerioAPI, fx: HtmlFixture): void {
  if (fx.navbox) {
    const wanted = fx.navbox;
    $('table.navbox, div.navbox').each((_, el) => {
      if ($(el).parents('table.navbox').length) return;
      const title = $(el).find('.navbox-title').first().text();
      if (!wanted.test(title)) $(el).remove();
    });
    // Sub dungeons are hundreds of floors and rooms the locations parser skips anyway.
    $('table.navbox table.navbox').each((_, el) => {
      const title = $(el).find('.navbox-title').first().text().trim();
      if (/^sub dungeons$/i.test(title)) $(el).remove();
    });
  }
  const remove = fx.navbox
    ? REMOVE_SELECTORS.filter((selector) => !/navbox/.test(selector))
    : REMOVE_SELECTORS;
  $(remove.join(',')).remove();
  if (fx.mobs) {
    const keep = new Set(fx.mobs);
    $('.mob-icon').each((_, el) => {
      // Red links are titled "Name (page does not exist)"; match them by their page name.
      const title = ($(el).find('.mob-name a').first().attr('title') ?? '').replace(
        / \(page does not exist\)$/,
        '',
      );
      if (!keep.has(title)) $(el).remove();
    });
  }
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
      stripPage($, fx);
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
