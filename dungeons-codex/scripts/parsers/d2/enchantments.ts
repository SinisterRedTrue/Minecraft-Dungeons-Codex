/**
 * D2 enchantments: the "List of enchantments" table of `Dungeons II:Enchantment`. The unobtainable
 * enchantments are a bullet list under their own heading, not rows, so they never get in.
 */
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type ParsedRow, type ParsedTable } from '../../wiki/tables';
import { cellAt, col, firstImage, makeSource } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import { d2Draft, d2First, d2Lines, introCount, singleValue, sourcesOf, tidy } from './common';

const ENCHANTMENT_LIST_PAGE = 'Dungeons II:Enchantment';

type AppliesTo = 'melee' | 'ranged' | 'armor';

/** "Melee Weapon" → melee, "Ranged Weapon" → ranged, "Armor (chestplate exclusive)" → armor. */
export function readAppliesTo(lines: readonly string[]): {
  appliesTo: AppliesTo[];
  restriction?: string;
} {
  const appliesTo: AppliesTo[] = [];
  let restriction: string | undefined;
  for (const line of lines) {
    const kind = /^melee/i.test(line)
      ? 'melee'
      : /^ranged/i.test(line)
        ? 'ranged'
        : /^armou?r/i.test(line)
          ? 'armor'
          : undefined;
    if (kind && !appliesTo.includes(kind)) appliesTo.push(kind);
    const note = /\(([^)]+)\)/.exec(line)?.[1];
    if (note) restriction = note.trim().replace(/^./, (c) => c.toUpperCase());
  }
  return { appliesTo, restriction };
}

interface EnchantmentRow {
  name: string;
  description?: string;
  levels: { level: 1 | 2 | 3; text: string; value?: number; unit?: string }[];
  appliesTo: AppliesTo[];
  restriction?: string;
  sources: ReturnType<typeof sourcesOf>;
  icon?: string;
}

function isEnchantmentTable(table: ParsedTable): boolean {
  return col(table.headers, /^applied to/i) >= 0 && col(table.headers, /^name/i) >= 0;
}

function readRow(row: ParsedRow, table: ParsedTable): EnchantmentRow | undefined {
  const h = table.headers;
  const name = d2First(cellAt(row, col(h, /^name/i)));
  if (!name) return undefined;
  const t1 = col(h, /^tier \/ i$/i);
  const levels: EnchantmentRow['levels'] = [];
  ([1, 2, 3] as const).forEach((level, i) => {
    const text = tidy(cellAt(row, t1 + i)?.lines.join(' ') ?? '');
    if (text) levels.push({ level, text, ...singleValue(text) });
  });
  const { appliesTo, restriction } = readAppliesTo(d2Lines(cellAt(row, col(h, /^applied to/i))));
  return {
    name,
    description: tidy(cellAt(row, col(h, /^in-game/i))?.lines.join(' ') ?? '') || undefined,
    levels,
    appliesTo,
    restriction,
    sources: sourcesOf(cellAt(row, col(h, /^obtaining/i))),
    icon: firstImage(cellAt(row, col(h, /^icon/i))),
  };
}

function readEnchantmentRows(html: string): EnchantmentRow[] {
  return parseWikitables(html)
    .filter(isEnchantmentTable)
    .flatMap((table) =>
      table.rows.map((row) => readRow(row, table)).filter((r): r is EnchantmentRow => !!r),
    );
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ENCHANTMENT_LIST_PAGE, ctx.client);
  const source = makeSource(list.title, list.revisionId, list.fetchedAt);
  const rows = readEnchantmentRows(list.html);
  const drafts: Draft[] = rows.map((row) => {
    const draft = d2Draft('enchantments', row.name, source, {
      appliesTo: row.appliesTo,
      levels: row.levels,
      obtaining: [],
    });
    if (row.description) draft.description = row.description;
    if (row.restriction) draft.restriction = row.restriction;
    if (row.icon) draft._image = row.icon;
    draft._refs = { sources: row.sources };
    return draft;
  });

  const obtainable = introCount(list.html, /of which (\d+) are obtainable/i);
  return {
    category: 'enchantments',
    drafts,
    dropped: [],
    expected: {
      count: obtainable ?? rows.length,
      note: `page intro: ${obtainable ?? '?'} obtainable enchantments (the unobtainable ones are only listed as bullets)`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
