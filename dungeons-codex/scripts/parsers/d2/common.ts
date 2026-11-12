/**
 * Helpers shared by the Dungeons II parsers. D2 list pages are plain wikitables; item pages carry
 * a small `{{Infobox Dungeons II …}}` (`[ Plans ]/03-CONTENT-MODEL.md` §4).
 */
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch } from '../../wiki/client';
import { parseNumber, type EffectUnit } from '../../wiki/text';
import { extractTemplate, stripWikiMarkup } from '../../wiki/templates';
import type { Cell } from '../../wiki/tables';
import type { Draft, ParseContext } from '../types';
import { makeSource } from '../common';

export const D2_PREFIX = 'Dungeons II:';

/** A link to a page that does not exist is titled `Name (page does not exist)`. */
export function stripRedlink(title: string): string {
  return title.replace(/\s*\(page does not exist\)$/i, '').trim();
}

/** `Dungeons II:Axe` → `Axe`; a trailing disambiguator such as `(mob)` is dropped. */
export function bareD2Title(title: string): string {
  return stripRedlink(title)
    .replace(/^Dungeons II:/i, '')
    .replace(/\s*\((?:mob|item|weapon|armor|armour|enchantment)\)$/i, '')
    .trim();
}

/**
 * A line of a wiki cell without the noise D2 tables carry: the sprite file name that leaks out
 * of `<img>` fallbacks (`File:Dungeons2Sprite sigil-of-beeswax.pngSigil of Beeswax`) and the
 * editorial brackets (`[verify]`, `[unofficial name]`, `[code-only name]`).
 */
export function tidy(line: string): string {
  return line
    .replace(/File:[^\n]*?\.(?:png|jpe?g|gif|webp|svg)/gi, '')
    .replace(/\[(?:verify|unofficial name|code-only name|sic|note \d+|\d+)\]/gi, '')
    .replace(/[\s ]+/g, ' ')
    .trim();
}

const PLACEHOLDER = /^(?:none|unknown|n\/a|—|-|\?+|unobtainable)$/i;

/** Cleaned, non-empty, non-placeholder lines of a cell. */
export function d2Lines(cell: Cell | undefined): string[] {
  return (cell?.lines ?? []).map(tidy).filter((l) => l && !PLACEHOLDER.test(l));
}

/** The first cleaned line of a cell (placeholders included, e.g. a name). */
export function d2First(cell: Cell | undefined): string {
  return (cell?.lines ?? []).map(tidy).find(Boolean) ?? '';
}

/** `Dungeons II:` page title of a name cell: its first D2 link, else the name itself. */
export function d2PageTitle(cell: Cell | undefined, name: string): string {
  const link = cell?.links.find((l) => /^Dungeons II:/i.test(l.title));
  return link ? stripRedlink(link.title) : `${D2_PREFIX}${name}`;
}

/** "COMMON / RARE / SPECIAL" → `common` (lowest tier, D-040); "UNIQUE" → `unique`. */
export function d2Rarity(cell: Cell | undefined): 'common' | 'rare' | 'special' | 'unique' {
  const text = (cell?.text ?? '').toLowerCase();
  if (text.includes('unique')) return 'unique';
  for (const rarity of ['common', 'rare', 'special'] as const) {
    if (text.includes(rarity)) return rarity;
  }
  return 'common';
}

/* ------------------------------------------------------------------------------------------ */
/* Effect numbers                                                                              */
/* ------------------------------------------------------------------------------------------ */

export interface D2EffectValue {
  label: string;
  value: number;
  unit: EffectUnit;
}

const NUMBER = /(?<![\w.])(\d+(?:[.,]\d+)?)\s*(%|seconds?|secs?|s\b)?/gi;
const REDUCING = /^(?:reduces?|decreases?|lowers?|shortens?)\b/i;

function unitOf(raw: string | undefined): EffectUnit {
  if (!raw) return 'flat';
  return raw === '%' ? '%' : 's';
}

/** The clause's words without one number: `"Grants an 60% chance to fire"` → `Grants chance to fire`. */
function labelWithout(clause: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  return clause
    .replace(new RegExp(String.raw`(?:\b(?:by|an?)\s+)?${escaped}(?:\s+of\b)?`), ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;])/g, '$1')
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '')
    .replace(/\s+(?:by|of|an?|for|to|in|at|than)$/i, '')
    .trim();
}

/**
 * Every number in a D2 effect line, labelled with the rest of its clause:
 * `"Frost attacks deal 30% more damage"` → `{label:'Frost attacks deal more damage', value:30, unit:'%'}`.
 * Clauses are split at sentence ends, `;`, commas and an "and" between two numbers; parentheses
 * (the wiki's "Although unstated…" remarks) are ignored. Verbs that reduce make the value negative.
 */
export function parseD2Effects(text: string): D2EffectValue[] {
  const out: D2EffectValue[] = [];
  const plain = text.replace(/\([^)]*\)/g, ' ');
  const clauses = plain.split(/\n|;|\.\s+|\.$|,\s+/).flatMap((clause) => {
    // "Deals 5% of weapon damage and increases knockback by 125%": one effect per number.
    const parts = clause.split(/\s+and\s+/i);
    return parts.length > 1 && parts.every((part) => /\d/.test(part)) ? parts : [clause];
  });
  for (const clause of clauses) {
    const trimmed = clause.trim();
    for (const match of trimmed.matchAll(NUMBER)) {
      const [token = '', number = '', unit] = match;
      const label = labelWithout(trimmed, token);
      if (!label) continue;
      const magnitude = Math.abs(parseNumber(number));
      out.push({
        label,
        value: REDUCING.test(trimmed) ? -magnitude : magnitude,
        unit: unitOf(unit?.toLowerCase()),
      });
    }
  }
  return out;
}

/** `"20% chance"` → `{value:20, unit:'%'}`; text with several numbers has no single value. */
export function singleValue(text: string): { value?: number; unit?: string } {
  const numbers = [...text.matchAll(NUMBER)];
  if (numbers.length !== 1) return {};
  const [, number = '', unit] = numbers[0] ?? [];
  const out: { value?: number; unit?: string } = { value: parseNumber(number) };
  if (unit === '%') out.unit = '%';
  else if (unit) out.unit = 's';
  return out;
}

/** The leading number of a talisman tier cell (`"25%/7000"` → 25 %, `"10% while …"` → 10 %). */
export function leadingValue(text: string): { value?: number; unit?: string } {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(%?)/.exec(text);
  if (!match?.[1]) return {};
  const out: { value?: number; unit?: string } = { value: parseNumber(match[1]) };
  if (match[2]) out.unit = '%';
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* Sources ("where it comes from")                                                             */
/* ------------------------------------------------------------------------------------------ */

/** One source line, classified; the linking pass resolves `name` to an entity id. */
export interface RefSource {
  kind: 'quest' | 'location' | 'mob';
  name: string;
  /** The cleaned original line, kept when the name does not resolve. */
  raw: string;
}

/**
 * Drop-location lines: `"The Silence in Little Howl (quest reward)"` → quest,
 * `"Reward from Gone Fishing"` → quest, `"Secret Chest in Rainy Plains"` → location,
 * `"Dropped by Mosstrosity"` → mob, anything else → location.
 */
export function classifySource(line: string): RefSource {
  const raw = tidy(line);
  const reward = /^(.*?)\s*\(quest reward\)$/i.exec(raw) ?? /^reward from\s+(.+)$/i.exec(raw);
  if (reward?.[1]) return { kind: 'quest', name: reward[1].trim(), raw };
  const chest = /^secret chest in\s+(.+)$/i.exec(raw);
  if (chest?.[1]) return { kind: 'location', name: chest[1].trim(), raw };
  const dropped = /^dropped by\s+(.+)$/i.exec(raw);
  if (dropped?.[1]) return { kind: 'mob', name: dropped[1].trim(), raw };
  return { kind: 'location', name: raw.replace(/\s*\([^)]*\)/g, '').trim(), raw };
}

export const sourcesOf = (cell: Cell | undefined): RefSource[] => d2Lines(cell).map(classifySource);

/* ------------------------------------------------------------------------------------------ */
/* Pairing and item pages                                                                      */
/* ------------------------------------------------------------------------------------------ */

/**
 * Pairs each unique row with the base row before it (D2 tables list a base item and then its
 * unique variant). Returns `variant index → base index`.
 */
export function pairWithBase(isUnique: readonly boolean[]): Map<number, number> {
  const pairs = new Map<number, number>();
  let base = -1;
  isUnique.forEach((unique, i) => {
    if (!unique) base = i;
    else if (base >= 0) pairs.set(i, base);
  });
  return pairs;
}

export interface D2ItemPage {
  title: string;
  revisionId?: number;
  fetchedAt: string;
  wikitext: string;
  infobox?: Record<string, string>;
}

/** Batch-fetches item pages and their `{{Infobox Dungeons II …}}` (missing pages are skipped). */
export async function loadD2Pages(
  ctx: ParseContext,
  titles: readonly string[],
  infobox = 'Infobox Dungeons II item',
): Promise<Map<string, D2ItemPage>> {
  const pages = await getWikitextBatch([...new Set(titles)], ctx.client);
  const out = new Map<string, D2ItemPage>();
  for (const [title, page] of pages) {
    if (page.missing || !page.wikitext) continue;
    out.set(title, {
      title: page.title,
      revisionId: page.revisionId,
      fetchedAt: page.fetchedAt,
      wikitext: page.wikitext,
      infobox: extractTemplate(page.wikitext, infobox) ?? undefined,
    });
  }
  return out;
}

/** Infobox text with markup removed. */
export function infoText(
  infobox: Record<string, string> | undefined,
  key: string,
): string | undefined {
  const raw = infobox?.[key];
  if (!raw) return undefined;
  const text = stripWikiMarkup(raw).replace(/\s+/g, ' ').trim();
  return text || undefined;
}

/** The identity and bookkeeping fields every D2 draft has. */
export function d2Draft(
  category: string,
  name: string,
  source: ReturnType<typeof makeSource>,
  extra: Record<string, unknown> = {},
): Draft {
  const slug = slugify(name);
  return {
    id: `d2:${category}:${slug}`,
    slug,
    game: 'd2',
    category,
    name,
    tags: [],
    related: [],
    source,
    quality: 'verified',
    ...extra,
  };
}

/** Source of a draft: the item page when it was fetched, else the list page. */
export function sourceFor(
  page: D2ItemPage | undefined,
  list: { title: string; revisionId: number; fetchedAt: string },
) {
  return page?.revisionId
    ? makeSource(page.title, page.revisionId, page.fetchedAt)
    : makeSource(list.title, list.revisionId, list.fetchedAt);
}

/** A count stated in a list page's intro text. */
export function introCount(html: string, pattern: RegExp): number | undefined {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const match = pattern.exec(text);
  return match?.[1] ? Number(match[1]) : undefined;
}
