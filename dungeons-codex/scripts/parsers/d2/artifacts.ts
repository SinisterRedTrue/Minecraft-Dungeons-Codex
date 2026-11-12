/**
 * D2 artifacts: the single "List of artifacts" table of `Dungeons II:Artifact` (icon, DLC
 * exclusive, soul cost, cooldown, description, obtainable location).
 */
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type ParsedTable } from '../../wiki/tables';
import { cellAt, col, firstImage, flag } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import { d2Draft, d2First, sourceFor, sourcesOf, tidy } from './common';

export const ARTIFACT_LIST_PAGE = 'Dungeons II:Artifact';

function isArtifactTable(table: ParsedTable): boolean {
  return col(table.headers, /^soul cost/i) >= 0 && col(table.headers, /^name/i) >= 0;
}

const numberOrUndefined = (text: string | undefined): number | undefined => {
  const t = (text ?? '').trim();
  return /^\d+(?:\.\d+)?$/.test(t) ? Number(t) : undefined;
};

export function readArtifactDrafts(
  html: string,
  list: { title: string; revisionId: number; fetchedAt: string },
): Draft[] {
  const drafts: Draft[] = [];
  for (const table of parseWikitables(html)) {
    if (!isArtifactTable(table)) continue;
    const idx = {
      icon: col(table.headers, /^icon/i),
      name: col(table.headers, /^name/i),
      dlc: col(table.headers, /dlc/i),
      soul: col(table.headers, /^soul cost/i),
      cooldown: col(table.headers, /^cooldown/i),
      description: col(table.headers, /^description/i),
      loc: col(table.headers, /^obtainable/i),
    };
    for (const row of table.rows) {
      const name = d2First(cellAt(row, idx.name));
      if (!name) continue;
      const soulCost = numberOrUndefined(cellAt(row, idx.soul)?.text);
      if (soulCost === undefined) continue;
      const draft = d2Draft('artifacts', name, sourceFor(undefined, list), {
        soulCost,
        requiresSouls: soulCost > 0,
        locations: [],
      });
      const cooldown = numberOrUndefined(cellAt(row, idx.cooldown)?.text);
      if (cooldown !== undefined) draft.cooldownSeconds = cooldown;
      const description = tidy(cellAt(row, idx.description)?.lines.join(' ') ?? '');
      if (description) draft.description = description;
      if (flag(cellAt(row, idx.dlc)) === true) draft.dlc = 'dlc';
      const icon = firstImage(cellAt(row, idx.icon));
      if (icon) draft._image = icon;
      draft._refs = { sources: sourcesOf(cellAt(row, idx.loc)) };
      drafts.push(draft);
    }
  }
  return drafts;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(ARTIFACT_LIST_PAGE, ctx.client);
  const drafts = readArtifactDrafts(list.html, list);
  return {
    category: 'artifacts',
    drafts,
    dropped: [],
    expected: {
      count: drafts.length,
      note: `${drafts.length} rows in the artifact table; the page states no total`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
