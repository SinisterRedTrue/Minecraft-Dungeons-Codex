/**
 * D1 weapons: `Dungeons:Weapon` list tables (Melee + Ranged sections, "Unused" skipped) for
 * membership and columns, then every item page's infobox and power table.
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parsePowerTable, toPowerTable } from '../../wiki/powerTable';
import { mapInfoboxStats } from '../../wiki/statMap';
import type { Draft, ParseContext, ParseResult } from '../types';
import {
  baseDraft,
  infoText,
  introNumber,
  linkGroups,
  loadItemPages,
  readItemRows,
  type ItemPage,
  type ItemRow,
} from './items';

export const WEAPON_LIST_PAGE = 'Dungeons:Weapon';

export function weaponDraft(
  item: ItemRow,
  page: ItemPage,
  listPage: { title: string; revisionId: number; fetchedAt: string },
): Draft {
  const draft = baseDraft('weapons', item, page, listPage);
  const kind = item.table.headingPath.some((h) => /^ranged/i.test(h)) ? 'ranged' : 'melee';
  draft.kind = kind;
  draft.weaponType = slugify(item.group);
  const { stats } = mapInfoboxStats(page.infobox ?? {});
  if (stats) draft.stats = stats;
  if (item.combo !== undefined && kind === 'melee') draft.comboLength = item.combo;
  const damageType = infoText(page.infobox, 'damagetype');
  if (damageType) draft.damageType = damageType;
  const table = page.page?.wikitext ? toPowerTable(parsePowerTable(page.page.wikitext)) : [];
  if (table.length) draft.powerTable = table;
  return draft;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(WEAPON_LIST_PAGE, ctx.client);
  const { rows, unusedCount } = readItemRows(list.html);
  const pages = await loadItemPages(
    ctx,
    rows.map((r) => r.pageTitle),
  );
  const drafts = rows.map((item) => weaponDraft(item, pages.get(item.pageTitle) ?? {}, list));
  linkGroups(drafts, 'weapons');

  const melee = introNumber(list.html, /There are (\d+) obtainable melee weapons/i);
  const ranged = introNumber(list.html, /There are (\d+) ranged weapons in total/i);
  const count = (melee ?? 0) + (ranged ?? 0) || rows.length;
  return {
    category: 'weapons',
    drafts,
    dropped: [],
    expected: {
      count,
      note: `page intro: ${melee ?? '?'} melee + ${ranged ?? '?'} ranged; ${unusedCount} unused weapon(s) skipped`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
