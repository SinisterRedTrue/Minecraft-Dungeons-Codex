/**
 * D1 cosmetics. `Dungeons:Cosmetic` is only an overview; its headings (Capes, Emotes, Flairs,
 * Heroes, Pets) each link to the real list through a "Main article" hatnote, so the sub-list
 * pages are discovered from that page, not guessed (`[ Plans ]/04-DATA-PIPELINE.md`).
 */
import * as cheerio from 'cheerio';
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type Cell, type ParsedTable } from '../../wiki/tables';
import { normalizeName } from '../../wiki/text';
import { cellAt, col, firstImage, firstLine, makeSource } from '../common';
import type { Draft, DroppedRecord, ParseContext, ParseResult } from '../types';

export const COSMETIC_PAGE = 'Dungeons:Cosmetic';

export type CosmeticType = 'cape' | 'pet' | 'emote' | 'flare' | 'skin';

const HEADING_TYPES: [RegExp, CosmeticType][] = [
  [/^capes?$/i, 'cape'],
  [/^emotes?$/i, 'emote'],
  [/^fl(?:air|are)s?$/i, 'flare'],
  [/^heroes$/i, 'skin'],
  [/^pets?$/i, 'pet'],
];

const SEASONS = /(Cloudy Climb|Luminous Night|Fauna Faire)/i;
const PAID_DLC =
  /(Jungle Awakens|Creeping Winter|Howling Peaks|Flames of the Nether|Hidden Depths|Echoing Void)/i;

export interface SubList {
  type: CosmeticType;
  title: string;
}

/** `[heading → "Main article" link]` pairs on the overview page. */
export function discoverSubLists(html: string): SubList[] {
  const $ = cheerio.load(html);
  const found: SubList[] = [];
  let current: CosmeticType | undefined;
  $('.mw-parser-output')
    .first()
    .children()
    .each((_, el) => {
      const $el = $(el);
      if (/^h[23]$/.test((el as { tagName: string }).tagName) || $el.is('.mw-heading')) {
        const text = normalizeName($el.find('h2, h3').first().text() || $el.text())
          .replace(/\[.*$/, '')
          .trim();
        current = HEADING_TYPES.find(([pattern]) => pattern.test(text))?.[1];
        return;
      }
      if (current && $el.is('.hatnote')) {
        const title = $el.find('a').first().attr('title');
        if (title && !found.some((f) => f.type === current)) found.push({ type: current, title });
      }
    });
  return found;
}

export interface Obtain {
  obtainedFrom: string;
  howToObtain?: string;
  season?: string;
  dlc?: string;
}

/** Free-text "Obtainability" → structured fields; `undefined` means "not obtainable". */
export function classifyObtain(raw: string): Obtain | undefined {
  const text = normalizeName(raw.replace(/\n/g, ' '));
  if (!text || /not obtainable|unobtainable|cannot be obtained/i.test(text)) return undefined;
  const out: Obtain = { obtainedFrom: 'other', howToObtain: text };
  const dlc = PAID_DLC.exec(text)?.[1];
  const season = SEASONS.exec(text)?.[1];
  if (dlc && !/hero pass|season pass|ultimate/i.test(text.slice(0, dlc.length + 20))) {
    out.obtainedFrom = 'dlc';
    out.dlc = slugify(dlc);
  } else if (/hero (?:edition|pass)|ultimate|season pass/i.test(text)) {
    out.obtainedFrom = 'hero-pass';
    if (dlc) out.dlc = slugify(dlc);
  } else if (season || /adventure pass|season/i.test(text)) {
    out.obtainedFrom = 'seasonal-adventure';
    if (season) out.season = season;
  } else if (/event|anniversary|thank you|celebrat|giveaway|twitch|promotion/i.test(text)) {
    out.obtainedFrom = 'event';
  } else if (/achievement/i.test(text)) {
    out.obtainedFrom = 'achievement';
  } else if (/store|purchas|bought|buy/i.test(text)) {
    out.obtainedFrom = 'store';
  }
  return out;
}

const SKIP_PATH = /unimplemented|removed|unused|sounds|achievements|history|concept|unobtainable/i;

interface CosmeticRow {
  name: string;
  type: CosmeticType;
  description?: string;
  image?: string;
  obtain?: Obtain;
  tags: string[];
  page: { title: string; revisionId: number; fetchedAt: string };
  notes?: string;
}

function rowsOfTable(
  table: ParsedTable,
  type: CosmeticType,
  page: CosmeticRow['page'],
): { rows: CosmeticRow[]; skipped: DroppedRecord[] } {
  const rows: CosmeticRow[] = [];
  const skipped: DroppedRecord[] = [];
  const idx = {
    name: col(table.headers, /^name/i),
    image: col(table.headers, /image/i),
    description: col(table.headers, /^description/i),
    obtain: col(table.headers, /obtainab/i),
    pass: col(table.headers, /adventure pass/i),
    notes: col(table.headers, /^notes/i),
  };
  const heading = table.headingPath;
  for (const row of table.rows) {
    const nameCell = cellAt(row, idx.name);
    const name = firstLine(nameCell);
    if (!name) continue;
    const description = normalizeName(cellAt(row, idx.description)?.lines.join(' ') ?? '');
    const entry: CosmeticRow = {
      name,
      type,
      description: description && description !== '—' ? description : undefined,
      image: firstImage(cellAt(row, idx.image)) ?? firstImage(nameCell),
      tags: [],
      page,
    };
    if (idx.obtain >= 0) {
      const obtain = classifyObtain(cellAt(row, idx.obtain)?.text ?? '');
      if (!obtain) {
        skipped.push({ name, reason: 'not obtainable in the game' });
        continue;
      }
      entry.obtain = obtain;
    } else if (idx.pass >= 0) {
      // Emotes and flairs: the section heading names the season; the pass column says how.
      const needsPass = /^yes/i.test(firstLine(cellAt(row, idx.pass)));
      const season = SEASONS.exec(heading.at(-1) ?? '')?.[1] ?? heading.at(-1);
      entry.obtain = {
        obtainedFrom: 'seasonal-adventure',
        season,
        howToObtain: needsPass
          ? `Reward of the ${season} Adventure Pass`
          : `Free reward of the ${season} Adventure`,
      };
      const kind = SEASONS.test(heading.at(-1) ?? '') ? heading.at(-2) : undefined;
      if (kind && type === 'flare')
        entry.tags.push(slugify(kind.replace(/\s*flairs?$/i, '')) + '-flair');
    }
    rows.push(entry);
  }
  return { rows, skipped };
}

/** Heroes: a three-column table (image, name, notes), no obtainability column. */
function heroRows(table: ParsedTable, page: CosmeticRow['page']): CosmeticRow[] {
  const idx = {
    image: col(table.headers, /^image/i),
    name: col(table.headers, /^name/i),
    notes: col(table.headers, /^notes/i),
  };
  const rows: CosmeticRow[] = [];
  for (const row of table.rows) {
    const name = firstLine(cellAt(row, idx.name));
    if (!name) continue;
    const notes = normalizeName(cellAt(row, idx.notes)?.lines.join(' ') ?? '');
    const obtain = notes ? classifyObtain(notes) : { obtainedFrom: 'other' };
    rows.push({
      name,
      type: 'skin',
      description: notes || undefined,
      image: firstImage(cellAt(row, idx.image)),
      obtain: obtain ? { ...obtain, howToObtain: undefined } : undefined,
      tags: [],
      page,
    });
  }
  return rows;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const overview = await parsePageHtml(COSMETIC_PAGE, ctx.client);
  const subLists = discoverSubLists(overview.html);
  const dropped: DroppedRecord[] = [];
  const notes = [`overview page revision ${overview.revisionId}`];
  const rows: CosmeticRow[] = [];

  for (const sub of subLists) {
    const page = await parsePageHtml(sub.title, ctx.client);
    notes.push(`${sub.type}: ${page.title} revision ${page.revisionId}`);
    const meta = { title: page.title, revisionId: page.revisionId, fetchedAt: page.fetchedAt };
    for (const table of parseWikitables(page.html)) {
      if (table.headingPath.some((h) => SKIP_PATH.test(h))) {
        if (col(table.headers, /^name/i) >= 0) {
          for (const r of table.rows) {
            const name = firstLine(r.cells[col(table.headers, /^name/i)] as Cell | undefined);
            if (name) dropped.push({ name, reason: `listed under "${table.headingPath.at(-1)}"` });
          }
        }
        continue;
      }
      if (
        sub.type === 'skin' &&
        col(table.headers, /^name/i) >= 0 &&
        col(table.headers, /notes/i) >= 0
      ) {
        rows.push(...heroRows(table, meta));
        continue;
      }
      if (col(table.headers, /^name/i) < 0 || col(table.headers, /image/i) < 0) continue;
      const result = rowsOfTable(table, sub.type, meta);
      rows.push(...result.rows);
      dropped.push(...result.skipped);
    }
  }

  const drafts: Draft[] = [];
  for (const row of rows) {
    const slug = slugify(row.name);
    if (!slug) {
      dropped.push({ name: row.name, reason: 'name has no usable slug' });
      continue;
    }
    const draft: Draft = {
      id: `d1:cosmetics:${slug}`,
      slug,
      game: 'd1',
      category: 'cosmetics',
      name: row.name,
      tags: row.tags,
      related: [],
      source: makeSource(row.page.title, row.page.revisionId, row.page.fetchedAt),
      quality: 'verified',
      cosmeticType: row.type,
      obtainedFrom: row.obtain?.obtainedFrom ?? 'other',
    };
    if (row.description) draft.description = row.description;
    if (row.obtain?.howToObtain) draft.howToObtain = row.obtain.howToObtain;
    if (row.obtain?.season) draft.season = row.obtain.season;
    if (row.obtain?.dlc) draft.dlc = row.obtain.dlc;
    if (row.image) draft._image = row.image;
    drafts.push(draft);
  }

  return {
    category: 'cosmetics',
    drafts,
    dropped,
    expected: {
      count: rows.length,
      note: `${rows.length} obtainable rows across ${subLists.length} sub-lists (${subLists.map((s) => s.type).join(', ')})`,
    },
    notes,
  };
}
