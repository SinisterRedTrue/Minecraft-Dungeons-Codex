/**
 * D1 armor: `Dungeons:Armor` list tables ("Unused" skipped), then each item page's infobox and
 * its Power → health table.
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parsePowerTable, toPowerTable } from '../../wiki/powerTable';
import { parseEffects } from '../../wiki/text';
import type { Draft, ParseContext, ParseResult } from '../types';
import {
  baseDraft,
  introNumber,
  linkGroups,
  loadItemPages,
  readItemRows,
  type ItemPage,
  type ItemRow,
} from './items';

export const ARMOR_LIST_PAGE = 'Dungeons:Armor';

export function armorDraft(
  item: ItemRow,
  page: ItemPage,
  listPage: { title: string; revisionId: number; fetchedAt: string },
  baseHealth: number | undefined,
): Draft {
  const draft = baseDraft('armor', item, page, listPage);
  draft.armorGroup = slugify(item.group);
  const effects = item.properties.flatMap((line) => parseEffects(line));
  draft.effects = effects.map((e) => ({ label: e.label, value: e.value, unit: e.unit }));
  const reduction = effects.find((e) => /damage reduction/i.test(e.label) && e.unit === '%');
  if (reduction) draft.damageReduction = Math.abs(reduction.value);
  if (baseHealth !== undefined) draft.baseHealth = baseHealth;
  const table = page.page?.wikitext
    ? toPowerTable(parsePowerTable(page.page.wikitext, { measure: 'health' }))
    : [];
  if (table.length) draft.powerTable = table;
  return draft;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ARMOR_LIST_PAGE, ctx.client);
  const { rows, unusedCount } = readItemRows(list.html);
  const pages = await loadItemPages(
    ctx,
    rows.map((r) => r.pageTitle),
  );
  const baseHealth = introNumber(list.html, /base health value of (\d+)/i);
  const drafts = rows.map((item) =>
    armorDraft(item, pages.get(item.pageTitle) ?? {}, list, baseHealth),
  );
  linkGroups(drafts, 'armor');

  const stated = introNumber(list.html, /There are (\d+) armors/i);
  return {
    category: 'armor',
    drafts,
    dropped: [],
    expected: {
      count: stated ?? rows.length,
      note: `page intro: ${stated ?? '?'} armors; ${unusedCount} unused armor(s) skipped`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
