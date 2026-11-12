/**
 * D1 DLC: the table on `Dungeons:DLC` (a redirect to "Downloadable content") gives title, cover and
 * release date; each DLC page adds the summary paragraph and the missions it brings.
 */
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch, parsePageHtml } from '../../wiki/client';
import { parseWikiDate } from '../../wiki/dates';
import { parseWikitables } from '../../wiki/tables';
import { findTemplates, stripWikiMarkup } from '../../wiki/templates';
import {
  bareTitle,
  cellAt,
  col,
  firstImage,
  firstLine,
  leadParagraph,
  makeSource,
  pageTitleOf,
  wikiSections,
} from '../common';
import type { Draft, DroppedRecord, ParseContext, ParseResult } from '../types';

const DLC_PAGE = 'Dungeons:DLC';

/** A bullet line → the name it links (`{{DuLevelLink|X}} (Secret Mission)` → `X`). */
function bulletName(line: string): string | undefined {
  const link = findTemplates(line).find((t) => /link$/i.test(t.name));
  const text = (link?.params['1'] ?? stripWikiMarkup(line)).replace(/\s*\(.*\)\s*$/, '').trim();
  return text || undefined;
}

/** Bullets of a body, leaving out content that came with free updates or is unused. */
function bulletNames(body: string): string[] {
  const names: string[] = [];
  for (const line of body.split('\n')) {
    if (!/^\s*\*/.test(line) || /\(\s*(?:free|unused)/i.test(stripWikiMarkup(line))) continue;
    const name = bulletName(line);
    if (name) names.push(name);
  }
  return names;
}

/**
 * The names a DLC page lists under `=== {group} ===`: bullets directly under the heading, plus
 * those under its `==== Added ====` sub-heading (not "Includes", which lists older content).
 */
export function addedNames(wikitext: string, group: string): string[] {
  const sections = wikiSections(wikitext);
  const start = sections.findIndex(
    (s) => s.level === 3 && s.heading.toLowerCase() === group.toLowerCase(),
  );
  const first = sections[start];
  if (!first) return [];
  const names = bulletNames(first.body);
  for (let i = start + 1; i < sections.length; i++) {
    const s = sections[i];
    if (!s || s.level <= 3) break;
    if (/^added$/i.test(s.heading)) names.push(...bulletNames(s.body));
  }
  return [...new Set(names)];
}

/** Missions a DLC page lists, e.g. `{{DuLevelLink|Dingy Jungle}}` or an "Added" sub-list. */
export function missionNames(wikitext: string): string[] {
  return addedNames(wikitext, 'Missions');
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(DLC_PAGE, ctx.client);
  const table = parseWikitables(list.html).find(
    (t) => col(t.headers, /^title/i) >= 0 && col(t.headers, /release/i) >= 0,
  );
  const dropped: DroppedRecord[] = [];
  if (!table) throw new Error(`${list.title}: no DLC table found`);
  const idx = {
    title: col(table.headers, /^title/i),
    cover: col(table.headers, /^cover/i),
    date: col(table.headers, /release/i),
  };

  interface Row {
    name: string;
    pageTitle: string;
    cover?: string;
    date?: string;
    dateText: string;
  }
  const rows: Row[] = [];
  for (const row of table.rows) {
    const titleCell = cellAt(row, idx.title);
    const name = firstLine(titleCell);
    if (!name) continue;
    const dateText = firstLine(cellAt(row, idx.date));
    rows.push({
      name,
      pageTitle: pageTitleOf(titleCell, name),
      cover: firstImage(cellAt(row, idx.cover)),
      date: parseWikiDate(dateText),
      dateText,
    });
  }

  const pages = await getWikitextBatch(
    rows.map((r) => r.pageTitle),
    ctx.client,
  );
  // Release order: by date, then by position in the table.
  const order = new Map(
    rows
      .map((r, position) => ({ r, position }))
      .sort(
        (a, b) => (a.r.date ?? '9999').localeCompare(b.r.date ?? '9999') || a.position - b.position,
      )
      .map(({ r }, i) => [r.name, i + 1]),
  );

  const drafts: Draft[] = [];
  for (const row of rows) {
    const page = pages.get(row.pageTitle);
    const summary = page?.wikitext ? leadParagraph(page.wikitext) : undefined;
    if (!summary) {
      dropped.push({ name: row.name, reason: `no summary paragraph on ${row.pageTitle}` });
      continue;
    }
    const slug = slugify(row.name);
    const draft: Draft = {
      id: `d1:dlcs:${slug}`,
      slug,
      game: 'd1',
      category: 'dlcs',
      name: row.name,
      tags: [],
      related: [],
      source: makeSource(
        page?.title ?? row.pageTitle,
        page?.revisionId,
        page?.fetchedAt ?? list.fetchedAt,
      ),
      quality: 'verified',
      order: order.get(row.name) ?? 0,
      summary,
      locationIds: [],
      contentCounts: { weapons: 0, armor: 0, artifacts: 0, mobs: 0, enchantments: 0 },
    };
    if (row.date) draft.releaseDate = row.date;
    if (row.cover) draft._image = row.cover;
    const wikitext = page?.wikitext ?? '';
    draft._refs = {
      locations: wikitext ? missionNames(wikitext) : [],
      mobsAdded: [...addedNames(wikitext, 'Mobs'), ...addedNames(wikitext, 'Entities')],
      enchantmentsAdded: addedNames(wikitext, 'Enchantments'),
    };
    drafts.push(draft);
  }

  return {
    category: 'dlcs',
    drafts,
    dropped,
    expected: {
      count: rows.length,
      note: `${rows.length} rows in the DLC table of ${bareTitle(list.title)}`,
    },
    notes: [`list page revision ${list.revisionId} (${list.title})`],
  };
}
