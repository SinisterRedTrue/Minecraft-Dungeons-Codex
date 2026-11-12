/**
 * D2 locations: the Overworld and Sift tables of `Dungeons II:Location` (one row per location;
 * a location with two rows, like Howling Woods, is merged) plus the top-level areas of the Rift
 * DLC bullet list. Each location page adds a description and the mobs found there.
 */
import * as cheerio from 'cheerio';
import { getWikitextBatch, parsePageHtml } from '../../wiki/client';
import { fileTitleFromSrc, parseWikitables } from '../../wiki/tables';
import { stripWikiMarkup } from '../../wiki/templates';
import { normalizeName } from '../../wiki/text';
import { cellAt, col, leadParagraph, wikiSections } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import { D2_PREFIX, d2Draft, d2First, d2Lines, sourceFor, tidy } from './common';
import { linkedNames } from './mobs';

const LOCATION_LIST_PAGE = 'Dungeons II:Location';

export interface LocationRow {
  name: string;
  pageTitle: string;
  region: string;
  type: 'overworld' | 'sift' | 'rift';
  stations: string[];
  subAreas: string[];
  icon?: string;
}

const REGION_TYPES: Record<string, LocationRow['type']> = {
  overworld: 'overworld',
  'the sift': 'sift',
};

const unique = <T>(values: T[]) => [...new Set(values)];

/** Rows of the Overworld / Sift tables, merged by name. */
export function readLocationRows(html: string): LocationRow[] {
  const byName = new Map<string, LocationRow>();
  for (const table of parseWikitables(html)) {
    const region = table.headingPath.at(-1) ?? '';
    const type = REGION_TYPES[region.toLowerCase()];
    if (!type || table.headingPath[0] !== 'Minecraft Dungeons II') continue;
    const idx = {
      image: col(table.headers, /^image/i),
      name: col(table.headers, /^location/i),
      stations: col(table.headers, /^minecart/i),
      sub: col(table.headers, /^sub-areas/i),
    };
    for (const row of table.rows) {
      const nameCell = cellAt(row, idx.name);
      const name = d2First(nameCell);
      if (!name) continue;
      const stations = d2Lines(cellAt(row, idx.stations)).map((s) =>
        s.replace(/\s*\((?:village)\)$/i, ''),
      );
      const subAreas = d2Lines(cellAt(row, idx.sub));
      const existing = byName.get(name);
      if (existing) {
        existing.stations = unique([...existing.stations, ...stations]);
        existing.subAreas = unique([...existing.subAreas, ...subAreas]);
        continue;
      }
      byName.set(name, {
        name,
        pageTitle:
          nameCell?.links.find((l) => /^Dungeons II:/i.test(l.title))?.title ??
          `${D2_PREFIX}${name}`,
        region,
        type,
        stations,
        subAreas,
        icon: nameCell?.images[0] ?? cellAt(row, idx.image)?.images[0],
      });
    }
  }
  return [...byName.values()];
}

/** The Rift DLC's top-level areas (with their nested areas as `subAreas`). */
export function readRiftAreas(html: string): LocationRow[] {
  const $ = cheerio.load(html);
  const rows: LocationRow[] = [];
  let inRift = false;
  $('.mw-parser-output')
    .first()
    .children()
    .each((_, el) => {
      const $el = $(el);
      const heading = $el.is('.mw-heading') ? $el.find('h2').first() : undefined;
      if (heading?.length) inRift = /the rift/i.test(heading.text());
      if (!inRift || !$el.is('ul')) return;
      $el.children('li').each((__, li) => {
        const $li = $(li);
        const own = $li.clone();
        own.children('ul').remove();
        const name = normalizeName(own.text());
        if (!name) return;
        const link = own.find('a').first();
        const src = own.find('img').first().attr('src');
        const subAreas = $li
          .find('li')
          .toArray()
          .map((sub) => normalizeName($(sub).clone().children('ul').remove().end().text()))
          .filter(Boolean);
        rows.push({
          name,
          pageTitle: link.attr('title') ?? `${D2_PREFIX}${name}`,
          region: 'The Rift',
          type: 'rift',
          stations: [],
          subAreas: unique(subAreas),
          icon: src ? fileTitleFromSrc(src) : undefined,
        });
      });
    });
  return rows;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(LOCATION_LIST_PAGE, ctx.client);
  const rows = [...readLocationRows(list.html), ...readRiftAreas(list.html)];
  const pages = await getWikitextBatch(
    rows.map((r) => r.pageTitle),
    ctx.client,
  );

  const drafts: Draft[] = rows.map((row) => {
    const page = pages.get(row.pageTitle);
    const wikitext = page && !page.missing ? (page.wikitext ?? '') : '';
    const mobSections = wikiSections(wikitext).filter(
      (s) =>
        s.level >= 3 && /friendlies|hostiles|characters|bosses|soul corrupted/i.test(s.heading),
    );
    const draft = d2Draft(
      'locations',
      row.name,
      sourceFor(
        page && !page.missing && page.revisionId
          ? { title: page.title, revisionId: page.revisionId, fetchedAt: page.fetchedAt, wikitext }
          : undefined,
        list,
      ),
      {
        locationType: row.type,
        region: row.region,
        stations: row.stations,
        subAreas: row.subAreas,
        mobIds: [],
        itemIds: [],
        questIds: [],
      },
    );
    if (row.type === 'rift') draft.dlc = 'the-rift';
    const description = wikitext ? leadParagraph(wikitext) : undefined;
    if (description) draft.description = tidy(stripWikiMarkup(description));
    if (row.icon) draft._image = row.icon;
    draft._refs = { mobs: unique(mobSections.flatMap((s) => linkedNames(s.body))) };
    return draft;
  });

  return {
    category: 'locations',
    drafts,
    dropped: [],
    expected: {
      count: rows.length,
      note: `${rows.length} locations (${rows.filter((r) => r.type !== 'rift').length} in the Overworld and Sift tables, ${rows.filter((r) => r.type === 'rift').length} Rift areas); the page states no total`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
