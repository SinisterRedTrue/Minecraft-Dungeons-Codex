/**
 * D2 talismans: the "List of talismans" table of `Dungeons II:Talisman`. Tier cells keep their raw
 * text ("10%", "25%/7000", "10% while health is above 95%", "N/A"); the leading number becomes
 * the tier's `value`.
 */
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type ParsedTable } from '../../wiki/tables';
import { cellAt, col, firstImage, flag } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import {
  classifySource,
  d2Draft,
  d2First,
  d2Lines,
  leadingValue,
  sourceFor,
  tidy,
  type RefSource,
} from './common';

export const TALISMAN_LIST_PAGE = 'Dungeons II:Talisman';

export const BOOST_TYPES = [
  'ranged',
  'movement',
  'drops',
  'artifact',
  'melee',
  'health',
  'pet',
  'damage',
  'souls',
  'experience',
] as const;

export type SourceType = 'quest-reward' | 'secret-chest' | 'boss-drop' | 'other';

/** The kind of the first source line decides `sourceType` (D-054). */
export function sourceTypeOf(sources: readonly RefSource[]): SourceType {
  const first = sources[0];
  if (!first) return 'other';
  if (first.kind === 'quest') return 'quest-reward';
  if (first.kind === 'mob') return 'boss-drop';
  return /^secret chest/i.test(first.raw) ? 'secret-chest' : 'other';
}

function isTalismanTable(table: ParsedTable): boolean {
  return col(table.headers, /^boost type/i) >= 0 && col(table.headers, /^name/i) >= 0;
}

export function readTalismanDrafts(
  html: string,
  list: { title: string; revisionId: number; fetchedAt: string },
): { drafts: Draft[]; problems: string[] } {
  const drafts: Draft[] = [];
  const problems: string[] = [];
  for (const table of parseWikitables(html)) {
    if (!isTalismanTable(table)) continue;
    const idx = {
      icon: col(table.headers, /^icon/i),
      name: col(table.headers, /^name/i),
      bonus: col(table.headers, /^passive bonus/i),
      secret: col(table.headers, /^secret/i),
      boost: col(table.headers, /^boost type/i),
      t1: col(table.headers, /^t1$/i),
      loc: col(table.headers, /^location/i),
    };
    for (const row of table.rows) {
      const name = d2First(cellAt(row, idx.name));
      if (!name) continue;
      const boost = d2First(cellAt(row, idx.boost)).toLowerCase();
      if (!(BOOST_TYPES as readonly string[]).includes(boost)) {
        problems.push(`${name}: unknown boost type "${boost}"`);
        continue;
      }
      const tiers = ([1, 2, 3] as const).map((tier, i) => {
        const raw = tidy(cellAt(row, idx.t1 + i)?.lines.join(' ') ?? '');
        return { tier, text: raw || 'N/A', ...leadingValue(raw) };
      });
      const sources = d2Lines(cellAt(row, idx.loc)).map(classifySource);
      const draft = d2Draft('talismans', name, sourceFor(undefined, list), {
        passiveBonus: d2First(cellAt(row, idx.bonus)),
        boostType: boost,
        isSecret: flag(cellAt(row, idx.secret)) === true,
        tiers,
        sourceType: sourceTypeOf(sources),
        locations: [],
      });
      const icon = firstImage(cellAt(row, idx.icon));
      if (icon) draft._image = icon;
      draft._refs = { sources };
      drafts.push(draft);
    }
  }
  return { drafts, problems };
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(TALISMAN_LIST_PAGE, ctx.client);
  const { drafts, problems } = readTalismanDrafts(list.html, list);
  const text = list.html.replace(/<[^>]+>/g, ' ');
  const secrets = /There are (\d+) secret talismans/i.exec(text)?.[1];
  return {
    category: 'talismans',
    drafts,
    dropped: problems.map((reason) => ({ name: reason.split(':')[0] ?? '', reason })),
    expected: {
      count: drafts.length + problems.length,
      note: `${drafts.length + problems.length} rows in the talisman table; the page states no total (it says ${secrets ?? '?'} are secret, the table marks ${drafts.filter((d) => d.isSecret).length})`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
