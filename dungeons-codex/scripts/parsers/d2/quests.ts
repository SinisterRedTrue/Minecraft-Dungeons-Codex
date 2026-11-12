/**
 * D2 quests: "List of core quests" and "List of side quests" on `Dungeons II:Quest`. The rewards
 * cell is a list of lines: XP, items, "Random …" draws and, for repeatable quests, "First
 * completion:" / "Subsequent completions:" blocks (D-055).
 */
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables } from '../../wiki/tables';
import { cellAt, col, flag } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import { d2Draft, d2First, d2Lines, sourceFor } from './common';

const QUEST_LIST_PAGE = 'Dungeons II:Quest';

/** What a `randomFrom` pool names, so the linking pass knows which index to look in. */
type PoolKind = 'gear' | 'armor' | 'artifact';

interface RawRandom {
  text: string;
  count: number;
  kind: PoolKind;
  names: string[];
}

export interface RawReward {
  when: 'first' | 'subsequent' | 'always';
  xp?: number;
  items: string[];
  random: RawRandom[];
}

const WORD_NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 };

/** "2 random pieces of Beekeeper Armor", "3 random gears from X", "Random gear from X". */
function readRandomLine(line: string): RawRandom | undefined {
  const match =
    /^(?:(\d+|a|an|one|two|three|four)\s+)?random\s+(pieces?|gears?|artifacts?)\s+(?:of|from)\s+(.+)$/i.exec(
      line,
    );
  if (!match) return undefined;
  const [, amount, noun = '', target = ''] = match;
  const count = amount ? (WORD_NUMBERS[amount.toLowerCase()] ?? Number(amount)) : 1;
  const kind: PoolKind = /^piece/i.test(noun)
    ? 'armor'
    : /^artifact/i.test(noun)
      ? 'artifact'
      : 'gear';
  return { text: line, count, kind, names: [target.trim()] };
}

/** Turns the lines of a rewards cell into one block per completion kind. */
export function parseRewardLines(lines: readonly string[]): RawReward[] {
  const blocks: RawReward[] = [];
  let current: RawReward = { when: 'always', items: [], random: [] };
  let pool: RawRandom | undefined;
  const open = (when: RawReward['when']) => {
    current = { when, items: [], random: [] };
    blocks.push(current);
    pool = undefined;
  };
  blocks.push(current);

  for (const line of lines) {
    if (/^first completion:?$/i.test(line)) {
      if (!current.items.length && !current.random.length && current.xp === undefined) blocks.pop();
      open('first');
      continue;
    }
    if (/^subsequent completions?:?$/i.test(line)) {
      open('subsequent');
      continue;
    }
    const xp = /^([\d,]+)\s+experience$/i.exec(line);
    if (xp?.[1]) {
      current.xp = Number(xp[1].replace(/,/g, ''));
      pool = undefined;
      continue;
    }
    const between = /^random\s+(artifact|gear|armor)s?\s+between:?$/i.exec(line);
    if (between) {
      pool = {
        text: line.replace(/:$/, ''),
        count: 1,
        kind: between[1]?.toLowerCase() === 'artifact' ? 'artifact' : 'gear',
        names: [],
      };
      current.random.push(pool);
      continue;
    }
    const random = readRandomLine(line);
    if (random) {
      current.random.push(random);
      pool = undefined;
      continue;
    }
    if (pool) pool.names.push(line);
    else current.items.push(line);
  }
  return blocks.filter((b) => b.items.length || b.random.length || b.xp !== undefined);
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(QUEST_LIST_PAGE, ctx.client);
  const drafts: Draft[] = [];
  const counts = { core: 0, side: 0 };
  for (const table of parseWikitables(list.html)) {
    const heading = (table.headingPath.at(-1) ?? '').toLowerCase();
    const questType = /core/.test(heading) ? 'core' : /side/.test(heading) ? 'side' : undefined;
    if (!questType || col(table.headers, /^rewards/i) < 0) continue;
    const idx = {
      name: col(table.headers, /^quest/i),
      loc: col(table.headers, /^location/i),
      rewards: col(table.headers, /^rewards/i),
      dlc: col(table.headers, /dlc/i),
    };
    for (const row of table.rows) {
      const name = d2First(cellAt(row, idx.name));
      if (!name) continue;
      counts[questType]++;
      const draft = d2Draft('quests', name, sourceFor(undefined, list), {
        questType,
        locationIds: [],
        areas: [],
        rewards: [],
        dlcExclusive: flag(cellAt(row, idx.dlc)) === true,
      });
      if (questType === 'core') draft.order = counts.core;
      draft._refs = {
        locations: d2Lines(cellAt(row, idx.loc)),
        rewards: parseRewardLines(d2Lines(cellAt(row, idx.rewards))),
      };
      drafts.push(draft);
    }
  }
  return {
    category: 'quests',
    drafts,
    dropped: [],
    expected: {
      count: drafts.length,
      note: `${counts.core} core + ${counts.side} side quests in the two tables; the page states no total`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
