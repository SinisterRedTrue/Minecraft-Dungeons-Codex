/**
 * D2 armor: `Dungeons II:Armor` has one table per slot (Helmets, Chestplates, Leggings, Boots).
 * Like weapons, a base piece is followed by its unique piece; each set has four pieces, which
 * the coverage report checks.
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables } from '../../wiki/tables';
import { cellAt, col, firstImage } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import {
  d2Draft,
  d2First,
  d2Lines,
  d2PageTitle,
  d2Rarity,
  infoText,
  loadD2Pages,
  pairWithBase,
  parseD2Effects,
  sourceFor,
  sourcesOf,
} from './common';

export const ARMOR_LIST_PAGE = 'Dungeons II:Armor';

const SLOTS: Record<string, 'helmet' | 'chestplate' | 'leggings' | 'boots'> = {
  helmets: 'helmet',
  chestplates: 'chestplate',
  leggings: 'leggings',
  boots: 'boots',
};

export interface ArmorRow {
  name: string;
  pageTitle: string;
  slot: 'helmet' | 'chestplate' | 'leggings' | 'boots';
  armorSet: string;
  unique: boolean;
  rarity: ReturnType<typeof d2Rarity>;
  effects: string[];
  sources: ReturnType<typeof sourcesOf>;
  icon?: string;
}

/** Armor rows per slot table, in page order. */
export function readArmorTables(html: string): ArmorRow[][] {
  const out: ArmorRow[][] = [];
  for (const table of parseWikitables(html)) {
    const slot = SLOTS[(table.headingPath[0] ?? '').toLowerCase()];
    if (!slot || col(table.headers, /^armor set/i) < 0) continue;
    const idx = {
      icon: col(table.headers, /^(?:icon|sprite)/i),
      name: col(table.headers, /^name/i),
      set: col(table.headers, /^armor set/i),
      rarity: col(table.headers, /^rarity/i),
      effects: col(table.headers, /^effects?/i),
      loc: col(table.headers, /^drop location/i),
    };
    const rows: ArmorRow[] = [];
    for (const row of table.rows) {
      const nameCell = cellAt(row, idx.name);
      const name = d2First(nameCell);
      if (!name) continue;
      const rarity = d2Rarity(cellAt(row, idx.rarity));
      rows.push({
        name,
        pageTitle: d2PageTitle(nameCell, name),
        slot,
        armorSet: d2First(cellAt(row, idx.set)),
        unique: rarity === 'unique',
        rarity,
        effects: d2Lines(cellAt(row, idx.effects)),
        sources: sourcesOf(cellAt(row, idx.loc)),
        icon: firstImage(cellAt(row, idx.icon)),
      });
    }
    out.push(rows);
  }
  return out;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ARMOR_LIST_PAGE, ctx.client);
  const tables = readArmorTables(list.html);
  const all = tables.flat();
  const pages = await loadD2Pages(
    ctx,
    all.map((r) => r.pageTitle),
  );

  const drafts: Draft[] = [];
  for (const rows of tables) {
    const pairs = pairWithBase(rows.map((r) => r.unique));
    const idOf = (row: ArmorRow) => `d2:armor:${slugify(row.name)}`;
    rows.forEach((row, i) => {
      const baseIndex = pairs.get(i);
      const base = baseIndex === undefined ? undefined : rows[baseIndex];
      const page = pages.get(row.pageTitle);
      const draft = d2Draft('armor', row.name, sourceFor(page, list), {
        rarity: row.rarity,
        slot: row.slot,
        armorSet: row.armorSet,
        isUnique: row.unique,
        variantIds: rows
          .filter((_, j) => pairs.get(j) === i)
          .map(idOf)
          .sort(),
        effects: row.effects,
        effectValues: row.effects.flatMap(parseD2Effects),
        locations: [],
      });
      if (base) draft.baseItemId = idOf(base);
      const description = infoText(page?.infobox, 'description');
      if (description) draft.description = description;
      const image =
        row.icon ?? (page?.infobox?.image ? `File:${page.infobox.image.trim()}` : undefined);
      if (image) draft._image = image;
      draft._refs = { sources: row.sources };
      drafts.push(draft);
    });
  }

  // Every set should have exactly one piece per slot.
  const sets = new Map<string, Set<string>>();
  for (const row of all) {
    const slots = sets.get(row.armorSet) ?? new Set<string>();
    slots.add(row.slot);
    sets.set(row.armorSet, slots);
  }
  const incomplete = [...sets].filter(([, slots]) => slots.size !== 4);
  const rowsPerSlot = tables.map((t) => t.length);
  return {
    category: 'armor',
    drafts,
    dropped: [],
    expected: {
      count: sets.size * 4,
      note: `${sets.size} armor sets × 4 slots (rows per slot table: ${rowsPerSlot.join('/')}); the page states no total`,
    },
    notes: [
      `list page revision ${list.revisionId}`,
      incomplete.length
        ? `incomplete sets: ${incomplete.map(([set, slots]) => `${set} (${[...slots].join(', ')})`).join('; ')}`
        : `all ${sets.size} sets have four pieces`,
    ],
  };
}
