/**
 * D1 locations. `Dungeons:Location` explains the location types; the full list is the "Minecraft
 * Dungeons locations" navbox (Missions, Secret missions, Sub-missions, grouped by region).
 * Sub dungeons (individual floors and rooms) and Unused locations are not included. Each location
 * page adds its story, the mobs table and, for secrets, the mission that unlocks it.
 */
import * as cheerio from 'cheerio';
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch, parsePageHtml } from '../../wiki/client';
import { fileTitleFromSrc } from '../../wiki/tables';
import { findTemplates, stripWikiMarkup } from '../../wiki/templates';
import { normalizeName } from '../../wiki/text';
import { bareTitle, makeSource, wikiSections } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';

const LOCATION_PAGE = 'Dungeons:Location';

export interface NavLocation {
  title: string;
  name: string;
  /** `Missions`, `Secret missions` or `Sub-missions`. */
  section: string;
  /** `Mainland`, `Island realms`, `Other dimensions`. */
  region: string;
  image?: string;
}

/** Locations of the navbox on the page, skipping Sub dungeons and "Unused" groups. */
export function readNavbox(html: string): NavLocation[] {
  const $ = cheerio.load(html);
  const outer = $('table.navbox')
    .toArray()
    .find(
      (nb) =>
        /locations/i.test($(nb).find('.navbox-title').first().text()) &&
        $(nb).find('table.navbox').length,
    );
  if (!outer) return [];
  const out: NavLocation[] = [];
  $(outer)
    .find('table.navbox')
    .each((_, inner) => {
      const section = normalizeName($(inner).find('> tbody > tr > th.navbox-top').first().text());
      if (!/^(?:missions|secret missions|sub-missions)$/i.test(section)) return;
      $(inner)
        .find('> tbody > tr')
        .each((__, tr) => {
          const region = normalizeName($(tr).children('th').not('.navbox-top').first().text());
          if (!region || /^unused$/i.test(region)) return;
          $(tr)
            .find('li')
            .each((___, li) => {
              const a = $(li).find('a[title^="Dungeons:"]').last();
              const title = a.attr('title');
              if (!title) return;
              const src = $(li).find('img').first().attr('src');
              out.push({
                title,
                name: bareTitle(title),
                section,
                region,
                image: src ? fileTitleFromSrc(src) : undefined,
              });
            });
        });
    });
  return out;
}

/** Mob names from the `Minecraft Dungeons` table under "Mobs and entities". */
export function mobNames(wikitext: string): string[] {
  const sections = wikiSections(wikitext);
  const start = sections.findIndex((s) => /^mobs and entities$/i.test(s.heading));
  if (start < 0) return [];
  const names: string[] = [];
  for (let i = start + 1; i < sections.length; i++) {
    const s = sections[i];
    if (!s || s.level <= (sections[start]?.level ?? 2)) break;
    if (!/^minecraft dungeons$/i.test(s.heading)) continue;
    for (const line of s.body.split('\n')) {
      const match = /^\|\s*\{\{DuEntityLink\|([^|}]+)/i.exec(line.trim());
      if (match?.[1]) names.push(normalizeName(match[1]));
    }
  }
  return names;
}

export function locationType(entry: NavLocation, name: string): string {
  if (/^camp$/i.test(name)) return 'camp';
  if (/^the tower$/i.test(name)) return 'tower';
  if (/^secret missions$/i.test(entry.section)) return 'secret';
  if (/^missions$/i.test(entry.section)) return 'mission';
  return 'other';
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(LOCATION_PAGE, ctx.client);
  const nav = readNavbox(list.html);
  if (nav.length === 0) throw new Error(`${list.title}: locations navbox not found`);

  // The same page can sit in several groups (Echoing Void is Mainland and an Other dimension).
  const byTitle = new Map<string, NavLocation>();
  for (const entry of nav) {
    const existing = byTitle.get(entry.title);
    if (!existing || (/^missions$/i.test(entry.section) && !/^missions$/i.test(existing.section))) {
      byTitle.set(entry.title, { ...entry, image: entry.image ?? existing?.image });
    }
  }
  const pages = await getWikitextBatch([...byTitle.keys()], ctx.client);

  const drafts: Draft[] = [];
  const missing: string[] = [];
  for (const [title, entry] of byTitle) {
    const page = pages.get(title);
    if (!page || page.missing || !page.wikitext) {
      missing.push(entry.name);
      continue;
    }
    const info = findTemplates(page.wikitext).find((t) =>
      /^Infobox Dungeons mission$/i.test(t.name),
    )?.params;
    const name = entry.name;
    const slug =
      slugify(name) || (/^secret missions$/i.test(entry.section) ? 'secret-mission' : 'unknown');
    const draft: Draft = {
      id: `d1:locations:${slug}`,
      slug,
      game: 'd1',
      category: 'locations',
      name,
      tags: [],
      related: [],
      source: makeSource(page.title, page.revisionId, page.fetchedAt),
      quality: 'verified',
      locationType: locationType(entry, name),
      region: entry.region
        .replace(/^Island realms$/i, 'Island Realms')
        .replace(/^Other dimensions$/i, 'Other Dimensions'),
      mobIds: [],
      itemIds: [],
    };
    const story = info?.story ? stripWikiMarkup(info.story).replace(/\n+/g, ' ').trim() : '';
    if (story) draft.description = story;
    if (entry.image) draft._image = entry.image;
    const unlock = info?.unlock
      ? findTemplates(info.unlock)
          .filter((t) => /levellink/i.test(t.name))
          .map((t) => stripWikiMarkup(t.params['1'] ?? ''))
      : [];
    draft._refs = { mobs: [...new Set(mobNames(page.wikitext))], unlock };
    drafts.push(draft);
  }

  return {
    category: 'locations',
    drafts,
    dropped: missing.map((name) => ({ name, reason: 'page not found' })),
    expected: {
      count: byTitle.size,
      note: `${byTitle.size} distinct Missions / Secret missions / Sub-missions in the navbox (Sub dungeons and Unused groups not included)`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
