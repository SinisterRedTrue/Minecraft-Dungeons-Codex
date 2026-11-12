/**
 * D1 enchantments: `Dungeons:Enchantment` → "List of enchantments" tables (Melee, Ranged, Armor,
 * Exclusive; "Unused" skipped). One enchantment can appear in several tables (Fire Aspect is both
 * melee and ranged), so rows are merged by name and `appliesTo` is the union.
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type Cell, type ParsedRow, type ParsedTable } from '../../wiki/tables';
import { normalizeName } from '../../wiki/text';
import { cellAt, col, firstImage, firstLine, flag, makeSource, namesOf } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';

const ENCHANTMENT_PAGE = 'Dungeons:Enchantment';

type AppliesTo = 'melee' | 'ranged' | 'armor';
type Costs = Record<'common' | 'powerful', [number, number, number]>;

const SECTION_APPLIES: Record<string, AppliesTo> = {
  melee: 'melee',
  ranged: 'ranged',
  armor: 'armor',
};

/** Common / Powerful point costs from the "Overview" table (Type | Tier I | Tier II | Tier III). */
export function readCosts(tables: ParsedTable[]): Costs | undefined {
  for (const table of tables) {
    const typeCol = col(table.headers, /^type/i);
    const t1 = col(table.headers, /tier.*\bI$/i);
    if (typeCol < 0 || t1 < 0) continue;
    const costs: Partial<Costs> = {};
    for (const row of table.rows) {
      const type = firstLine(cellAt(row, typeCol)).toLowerCase();
      const values = [t1, t1 + 1, t1 + 2].map((i) => Number(cellAt(row, i)?.text.trim()));
      if ((type === 'common' || type === 'powerful') && values.every(Number.isInteger)) {
        costs[type] = values as [number, number, number];
      }
    }
    if (costs.common && costs.powerful) return costs as Costs;
  }
  return undefined;
}

/** `"20%"` → `{value: 20, unit: '%'}`; `"+X"`, `"Next 2"`, `"fifth"` → no number. */
export function parseLevelValue(text: string): { value?: number; unit?: string } {
  const match = /^\+?(-?\d+(?:\.\d+)?)\s*(%?)$/.exec(text.trim());
  if (!match?.[1]) return {};
  const out: { value?: number; unit?: string } = { value: Number(match[1]) };
  if (match[2]) out.unit = '%';
  return out;
}

function levelsOf(row: ParsedRow, t1: number, tierText: string) {
  const levels: { level: 1 | 2 | 3; text: string; value?: number; unit?: string }[] = [];
  ([1, 2, 3] as const).forEach((level, i) => {
    const raw = normalizeName(cellAt(row, t1 + i)?.text ?? '');
    if (!raw) return;
    const text = tierText.includes('#')
      ? tierText.replace('#', raw)
      : tierText
        ? `${raw} ${tierText}`
        : raw;
    levels.push({ level, text, ...parseLevelValue(raw) });
  });
  return levels;
}

interface Row {
  name: string;
  section: string;
  cells: { icon?: string; description?: string; gilded?: string };
  levels: ReturnType<typeof levelsOf>;
  mob: boolean;
  stackable: boolean;
  builtInto: string[];
  cost?: 'common' | 'powerful';
}

function readRow(row: ParsedRow, table: ParsedTable, section: string): Row | undefined {
  const h = table.headers;
  const name = firstLine(cellAt(row, col(h, /^name/i)));
  if (!name) return undefined;
  const mobCell: Cell | undefined = cellAt(row, col(h, /^mob obtain/i));
  const costText = firstLine(cellAt(row, col(h, /^cost/i))).toLowerCase();
  const gilded = normalizeName(cellAt(row, col(h, /^gilded/i))?.lines.join(' ') ?? '');
  return {
    name,
    section,
    cells: {
      icon: firstImage(cellAt(row, col(h, /^icon/i))),
      description: normalizeName(cellAt(row, col(h, /^in-game/i))?.lines.join(' ') ?? ''),
      gilded: gilded || undefined,
    },
    levels: levelsOf(row, col(h, /^tier \/ i$/i), firstLine(cellAt(row, col(h, /^tier text/i)))),
    mob: flag(mobCell) !== false,
    stackable: flag(cellAt(row, col(h, /^multiple/i))) === true,
    builtInto: namesOf(cellAt(row, col(h, /^built/i))),
    cost: costText === 'common' || costText === 'powerful' ? costText : undefined,
  };
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ENCHANTMENT_PAGE, ctx.client);
  const tables = parseWikitables(list.html);
  const costs = readCosts(tables);
  const source = makeSource(list.title, list.revisionId, list.fetchedAt);
  const merged = new Map<string, Draft & { _rows: Row[] }>();
  let skippedUnused = 0;

  for (const table of tables) {
    if (table.headingPath[0] !== 'List of enchantments') continue;
    const section = (table.headingPath.at(-1) ?? '').toLowerCase();
    if (section === 'unused') {
      skippedUnused += table.rows.length;
      continue;
    }
    for (const tableRow of table.rows) {
      const row = readRow(tableRow, table, section);
      if (!row) continue;
      const slug = slugify(row.name);
      const existing = merged.get(slug);
      if (existing) {
        existing._rows.push(row);
        continue;
      }
      merged.set(slug, { id: `d1:enchantments:${slug}`, slug, name: row.name, _rows: [row] });
    }
  }

  const drafts: Draft[] = [];
  for (const entry of merged.values()) {
    const rows = entry._rows;
    const first = rows[0];
    if (!first) continue;
    const appliesTo = [
      ...new Set(rows.map((r) => SECTION_APPLIES[r.section]).filter((a): a is AppliesTo => !!a)),
    ];
    const exclusive = rows.some((r) => r.section === 'exclusive');
    const builtInto = [...new Set(rows.flatMap((r) => r.builtInto))];
    const mobObtainable = rows.some((r) => r.mob);
    const cost = rows.map((r) => r.cost).find(Boolean);
    const withLevels = rows.find((r) => r.levels.length > 0);
    const description = rows.map((r) => r.cells.description).find(Boolean);
    const gilded = rows.map((r) => r.cells.gilded).find(Boolean);
    const image = rows.map((r) => r.cells.icon).find(Boolean);
    const draft: Draft = {
      id: entry.id as string,
      slug: entry.slug as string,
      game: 'd1',
      category: 'enchantments',
      name: entry.name,
      tags: [],
      related: [],
      source,
      quality: 'verified',
      appliesTo,
      isGilded: false,
      levels: withLevels?.levels ?? [],
      stackable: rows.some((r) => r.stackable),
      mobObtainable,
      builtInto: [],
      section: exclusive
        ? mobObtainable && builtInto.length === 0
          ? 'mob-exclusive'
          : 'exclusive'
        : 'standard',
    };
    if (description) draft.description = description;
    if (gilded) draft.gildedDescription = gilded;
    if (cost && costs) {
      draft.tier = cost;
      draft.pointCost = costs[cost];
    }
    if (image) draft._image = image;
    draft._refs = { builtInto, exclusiveKinds: exclusive };
    drafts.push(draft);
  }

  return {
    category: 'enchantments',
    drafts,
    dropped: [],
    expected: {
      count: merged.size,
      note: `${merged.size} distinct names in the Melee/Ranged/Armor/Exclusive tables; ${skippedUnused} unused skipped; page states no total`,
    },
    notes: [
      `list page revision ${list.revisionId}`,
      costs
        ? `point costs from the Overview table: common ${costs.common.join('/')}, powerful ${costs.powerful.join('/')}`
        : 'no Overview cost table found',
    ],
  };
}
