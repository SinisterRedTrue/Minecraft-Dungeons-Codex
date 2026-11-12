/**
 * D1 artifacts: `Dungeons:Artifact` tables, one per artifact type ("Unused" skipped); each item
 * page adds the description and rarity.
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type ParsedTable } from '../../wiki/tables';
import { parseCooldown } from '../../wiki/text';
import {
  cellAt,
  col,
  firstImage,
  firstLine,
  flag,
  joinWrappedLines,
  lines,
  makeSource,
  pageTitleOf,
  realLines,
} from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import { infoText, introNumber, loadItemPages } from './items';

const ARTIFACT_PAGE = 'Dungeons:Artifact';

const ARTIFACT_TYPES: [RegExp, string][] = [
  [/^damaging/i, 'damaging'],
  [/^status/i, 'status'],
  [/^quiver/i, 'quiver'],
  [/^summoning/i, 'summoning'],
  [/^agility/i, 'agility'],
  [/^defensive/i, 'defensive'],
];

export function artifactTypeOf(table: ParsedTable): string | undefined {
  const heading = table.headingPath.at(-1) ?? '';
  return ARTIFACT_TYPES.find(([pattern]) => pattern.test(heading))?.[1];
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ARTIFACT_PAGE, ctx.client);
  const source = makeSource(list.title, list.revisionId, list.fetchedAt);
  interface Row {
    name: string;
    type: string;
    pageTitle: string;
    draft: Draft;
  }
  const rows: Row[] = [];
  let unused = 0;

  for (const table of parseWikitables(list.html)) {
    if (col(table.headers, /^name/i) < 0 || col(table.headers, /soul/i) < 0) continue;
    if (table.headingPath.some((h) => /^unused$/i.test(h))) {
      unused += table.rows.length;
      continue;
    }
    const type = artifactTypeOf(table);
    if (!type) continue;
    const idx = {
      icon: col(table.headers, /^icon/i),
      name: col(table.headers, /^name/i),
      dlc: col(table.headers, /dlc/i),
      soul: col(table.headers, /soul/i),
      props: col(table.headers, /^properties/i),
      cooldown: col(table.headers, /^cooldown/i),
      loc: col(table.headers, /^obtainable/i),
    };
    for (const row of table.rows) {
      const nameCell = cellAt(row, idx.name);
      const name = firstLine(nameCell);
      if (!name) continue;
      const slug = slugify(name);
      const dlcCell = cellAt(row, idx.dlc);
      const dlcName = flag(dlcCell) === undefined ? firstLine(dlcCell) : undefined;
      const cooldownText = cellAt(row, idx.cooldown)?.text ?? '';
      const cooldown = parseCooldown(cooldownText);
      const draft: Draft = {
        id: `d1:artifacts:${slug}`,
        slug,
        game: 'd1',
        category: 'artifacts',
        name,
        tags: [],
        related: [],
        source,
        quality: 'verified',
        artifactType: type,
        requiresSouls: flag(cellAt(row, idx.soul)) === true,
        properties: joinWrappedLines(realLines(cellAt(row, idx.props))),
        locations: [],
      };
      if (cooldown !== undefined) draft.cooldownSeconds = cooldown;
      const internalId = lines(nameCell)[1];
      if (internalId && !/\s/.test(internalId)) draft.internalId = internalId;
      const icon = firstImage(cellAt(row, idx.icon));
      if (icon) draft._image = icon;
      draft._refs = { dlc: dlcName, locations: realLines(cellAt(row, idx.loc)) };
      rows.push({ name, type, pageTitle: pageTitleOf(nameCell, name), draft });
    }
  }

  const pages = await loadItemPages(
    ctx,
    rows.map((r) => r.pageTitle),
  );
  for (const row of rows) {
    const page = pages.get(row.pageTitle);
    const description = infoText(page?.infobox, 'description');
    if (description) row.draft.description = description;
    if (page?.page?.revisionId) {
      row.draft.source = makeSource(page.page.title, page.page.revisionId, page.page.fetchedAt);
    }
    const rarity = (page?.infobox?.rarity ?? '').toLowerCase();
    row.draft.rarity = rarity.includes('unique')
      ? 'unique'
      : rarity.includes('rare') && !rarity.includes('common')
        ? 'rare'
        : 'common';
  }

  const stated = introNumber(list.html, /There are (\d+) artifacts in total/i);
  return {
    category: 'artifacts',
    drafts: rows.map((r) => r.draft),
    dropped: [],
    expected: {
      count: stated ?? rows.length,
      note: `page intro: ${stated ?? '?'} artifacts; ${unused} unused skipped`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
