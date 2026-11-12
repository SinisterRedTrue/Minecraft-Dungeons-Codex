/**
 * Shared machinery for D1 weapons and armor: both come from list tables on `Dungeons:Weapon` /
 * `Dungeons:Armor` (membership + columns) and are enriched from each item page's
 * `{{Infobox Dungeons item}}` and power table (`[ Plans ]/04-DATA-PIPELINE.md`).
 */
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch, type WikitextPage } from '../../wiki/client';
import { parseWikitables, type ParsedRow, type ParsedTable } from '../../wiki/tables';
import { extractTemplate, stripWikiMarkup } from '../../wiki/templates';
import { normalizeName } from '../../wiki/text';
import {
  cellAt,
  col,
  firstImage,
  firstLine,
  flag,
  makeSource,
  namesOf,
  pageTitleOf,
  realLines,
} from '../common';
import type { Draft, ParseContext } from '../types';

export interface ItemRow {
  name: string;
  pageTitle: string;
  group: string;
  isUnique: boolean;
  dlcName?: string;
  accepts: boolean;
  properties: string[];
  builtIn: string[];
  combo?: number;
  locations: string[];
  seasonal: boolean;
  icon?: string;
  table: ParsedTable;
}

type ColumnIndex = Record<
  'icon' | 'name' | 'group' | 'unique' | 'dlc' | 'soul' | 'props' | 'builtIn' | 'combo' | 'loc',
  number
>;

/** Is this a list table of items (as opposed to history/achievement tables)? */
function isItemTable(table: ParsedTable): boolean {
  return col(table.headers, /^icon/i) >= 0 && col(table.headers, /^group of/i) >= 0;
}

/** Item rows of every non-"Unused" list table, in page order. */
export function readItemRows(
  html: string,
  filter: (table: ParsedTable) => boolean = () => true,
): { rows: ItemRow[]; unusedCount: number } {
  const rows: ItemRow[] = [];
  let unusedCount = 0;
  for (const table of parseWikitables(html)) {
    if (!isItemTable(table) || !filter(table)) continue;
    const idx: ColumnIndex = {
      icon: col(table.headers, /^icon/i),
      name: col(table.headers, /^name/i),
      group: col(table.headers, /^group of/i),
      unique: col(table.headers, /^unique/i),
      dlc: col(table.headers, /dlc/i),
      soul: col(table.headers, /soul/i),
      props: col(table.headers, /^properties/i),
      builtIn: col(table.headers, /built/i),
      combo: col(table.headers, /combo/i),
      loc: col(table.headers, /^obtainable/i),
    };
    // Unused items sit under an "Unused" heading, or (Spider Crossbow) in a table that has no
    // "Obtainable location" column at all.
    const unused = table.headingPath.some((h) => /^unused$/i.test(h)) || idx.loc < 0;
    for (const row of table.rows) {
      if (unused) {
        unusedCount++;
        continue;
      }
      const item = readRow(row, table, idx);
      if (item) rows.push(item);
    }
  }
  return { rows, unusedCount };
}

function readRow(row: ParsedRow, table: ParsedTable, idx: ColumnIndex): ItemRow | undefined {
  const nameCell = cellAt(row, idx.name);
  const name = firstLine(nameCell);
  if (!name) return undefined;
  const dlcCell = cellAt(row, idx.dlc);
  const dlcText = normalizeName(dlcCell?.text ?? '');
  const dlcName = flag(dlcCell) === undefined && dlcText ? dlcText.split('\n')[0] : undefined;
  const comboText = cellAt(row, idx.combo)?.text.trim() ?? '';
  const item: ItemRow = {
    name,
    pageTitle: pageTitleOf(nameCell, name),
    group: firstLine(cellAt(row, idx.group)) || name,
    isUnique: flag(cellAt(row, idx.unique)) === true,
    dlcName: dlcName?.replace(/\s*\(DLC\)$/i, ''),
    accepts: flag(cellAt(row, idx.soul)) === true,
    properties: realLines(cellAt(row, idx.props)),
    builtIn: namesOf(cellAt(row, idx.builtIn)),
    locations: realLines(cellAt(row, idx.loc)),
    seasonal: Boolean(row.section),
    icon: firstImage(cellAt(row, idx.icon)),
    table,
  };
  if (/^\d+$/.test(comboText)) item.combo = Number(comboText);
  return item;
}

export interface ItemPage {
  page?: WikitextPage;
  infobox?: Record<string, string>;
}

/** Batch-fetches the wikitext of every item page and extracts its infobox. */
export async function loadItemPages(
  ctx: ParseContext,
  titles: readonly string[],
): Promise<Map<string, ItemPage>> {
  const pages = await getWikitextBatch(titles, ctx.client);
  const out = new Map<string, ItemPage>();
  for (const [title, page] of pages) {
    const infobox = page.wikitext
      ? extractTemplate(page.wikitext, 'Infobox Dungeons item')
      : undefined;
    out.set(title, { page: page.missing ? undefined : page, infobox });
  }
  return out;
}

/** Infobox text field with markup removed (`description`, `damagetype`). */
export function infoText(
  infobox: Record<string, string> | undefined,
  key: string,
): string | undefined {
  const raw = infobox?.[key];
  if (!raw) return undefined;
  const text = stripWikiMarkup(raw).replace(/\n+/g, ' ').trim();
  return text || undefined;
}

/** Rarity words in an infobox `rarity` value. */
function infoRarities(infobox: Record<string, string> | undefined): string[] {
  const text = stripWikiMarkup(infobox?.rarity ?? '').toLowerCase();
  return ['common', 'rare', 'unique'].filter((r) => text.includes(r));
}

/**
 * Rarity: unique items are `unique`. A base item the wiki lists as Common and Rare (the usual
 * case) gets `common`, its lowest tier; one listed only as Rare gets `rare` (D-040).
 */
function itemRarity(item: ItemRow, infobox: Record<string, string> | undefined) {
  if (item.isUnique) return 'unique';
  const found = infoRarities(infobox);
  return found.includes('rare') && !found.includes('common') ? 'rare' : 'common';
}

/** The fields weapons and armor share; `_refs` carries what the linking pass resolves. */
export function baseDraft(
  category: 'weapons' | 'armor',
  item: ItemRow,
  page: ItemPage,
  listPage: { title: string; revisionId: number; fetchedAt: string },
): Draft {
  const slug = slugify(item.name);
  const source = page.page?.revisionId
    ? makeSource(page.page.title, page.page.revisionId, page.page.fetchedAt)
    : makeSource(listPage.title, listPage.revisionId, listPage.fetchedAt);
  const draft: Draft = {
    id: `d1:${category}:${slug}`,
    slug,
    game: 'd1',
    category,
    name: item.name,
    rarity: itemRarity(item, page.infobox),
    tags: [],
    related: [],
    source,
    quality: 'verified',
    isUnique: item.isUnique,
    variantIds: [],
    properties: item.properties,
    builtInEnchantments: [],
    acceptsSoulEnchantments: item.accepts,
    locations: [],
    isSeasonal: item.seasonal,
  };
  const description = infoText(page.infobox, 'description');
  if (description) draft.description = description;
  const image =
    item.icon ?? (page.infobox?.image ? `File:${page.infobox.image.trim()}` : undefined);
  if (image) draft._image = image;
  draft._refs = {
    group: item.group,
    dlc: item.dlcName,
    builtIn: item.builtIn,
    locations: item.locations,
  };
  return draft;
}

/**
 * Fills `baseItemId` / `variantIds` from the "Group of" column: within one group the non-unique
 * row is the base item and every unique row is one of its variants.
 */
export function linkGroups(drafts: Draft[], category: 'weapons' | 'armor'): void {
  const groups = new Map<string, Draft[]>();
  for (const draft of drafts) {
    const group = String((draft._refs as { group: string }).group);
    const list = groups.get(group) ?? [];
    list.push(draft);
    groups.set(group, list);
  }
  for (const members of groups.values()) {
    const base = members.find((m) => !m.isUnique);
    if (!base) continue;
    const variants = members.filter((m) => m.isUnique);
    base.variantIds = variants.map((v) => `d1:${category}:${String(v.slug)}`).sort();
    for (const variant of variants) variant.baseItemId = base.id;
  }
}

/** A count stated in a list page's intro text, e.g. "There are 71 armors". */
export function introNumber(html: string, pattern: RegExp): number | undefined {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = pattern.exec(text);
  return match?.[1] ? Number(match[1]) : undefined;
}
