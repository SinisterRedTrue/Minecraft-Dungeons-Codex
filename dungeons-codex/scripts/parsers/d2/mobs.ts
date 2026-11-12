/**
 * D2 mobs: `Dungeons II:Mob` is a set of icon lists under headings (Friendlies, Enemies, Bosses, …).
 * Cinematic, unused and promotional-only mobs are skipped (D-014). A mob often sits under several
 * headings (an Evoker is an Illager, a Mini-boss and an Enemy), so the first match in
 * {@link PRIMARY_ORDER} gives `mobType` and the sub-lists (Undead, Illagers, …) become tags
 * (D-058). Each mob page adds health, spawn locations and tier variants.
 */
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch, parsePageHtml } from '../../wiki/client';
import { fileTitleFromSrc } from '../../wiki/tables';
import { findTemplates, stripWikiMarkup } from '../../wiki/templates';
import { normalizeName } from '../../wiki/text';
import { wikiSections } from '../common';
import type { Draft, DroppedRecord, ParseContext, ParseResult } from '../types';
import { bareD2Title, d2Draft, sourceFor, stripRedlink, tidy } from './common';

export const MOB_LIST_PAGE = 'Dungeons II:Mob';

/** Heading (lower-case) → mob type or tag. */
const SECTION_TYPES: Record<string, { type?: string; tag?: string }> = {
  friendlies: { type: 'passive' },
  characters: { type: 'character' },
  merchants: { type: 'merchant' },
  companions: { type: 'companion' },
  pets: { type: 'pet' },
  'non-attackable': { type: 'non-attackable' },
  enemies: { type: 'common' },
  undead: { tag: 'undead' },
  illagers: { tag: 'illager' },
  sifters: { tag: 'sifter' },
  sculkers: { tag: 'sculker' },
  'mini-bosses': { type: 'mini-boss' },
  bosses: { type: 'boss' },
  'non-typical mobs': { type: 'hazard' },
  'summoned hazards': { type: 'hazard' },
  'mob-like': { type: 'non-attackable' },
};

/** Which type wins when a mob is listed under several headings (first match). */
const PRIMARY_ORDER = [
  'boss',
  'mini-boss',
  'hazard',
  'merchant',
  'character',
  'companion',
  'pet',
  'non-attackable',
  'common',
  'passive',
];

const SKIPPED = /cinematic|item descriptions|unused|supplementary/;

export interface MobIcon {
  title: string;
  name: string;
  image?: string;
  /** Headings above the list, outermost first (without "List of mobs"). */
  path: string[];
}

/** Every `.mob-icon` under "List of mobs", with the headings above it. */
export function readMobIcons(html: string): MobIcon[] {
  const $ = cheerio.load(html);
  const icons: MobIcon[] = [];
  const path: string[] = [];
  $('.mw-parser-output')
    .first()
    .children()
    .each((_, el) => {
      const $el = $(el);
      const heading = $el.is('.mw-heading') ? $el.find('h2, h3, h4').first() : undefined;
      if (heading?.length) {
        const level = Number((heading.get(0) as Element).tagName[1]) - 2;
        path.length = level;
        path[level] = normalizeName(heading.text().replace(/\[.*$/, ''));
        return;
      }
      if (!$el.is('.mob-icon-list') || path[0] !== 'List of mobs') return;
      $el.find('.mob-icon').each((__, icon) => {
        const link = $(icon).find('.mob-name a').first();
        const title = stripRedlink(link.attr('title') ?? '');
        if (!title) return;
        const src = $(icon).find('img').first().attr('src');
        icons.push({
          title,
          name: bareD2Title(title),
          image: src ? fileTitleFromSrc(src) : undefined,
          path: path.slice(1).filter(Boolean),
        });
      });
    });
  return icons;
}

/** Mob pages use `{{Infobox Dungeons II entity}}`, or the D1 `{{Infobox Dungeons entity}}` for shared mobs. */
export function mobInfobox(wikitext: string): Record<string, string> | undefined {
  return findTemplates(wikitext).find((t) => /^Infobox Dungeons(?: II)? entity$/i.test(t.name))
    ?.params;
}

/** Page names inside `{{MCD2Link|id=Deep Dark|The Deep Dark}}` calls of a wikitext block. */
export function linkedNames(body: string): string[] {
  return [
    ...new Set(
      findTemplates(body)
        .filter((t) => /^MCD2Link$/i.test(t.name))
        .map((t) => tidy(stripWikiMarkup(t.params.id ?? t.params['1'] ?? '')))
        .filter(Boolean),
    ),
  ];
}

/** Infobox health: a number when it is plain, else the tier lines joined with commas. */
export function healthOf(raw: string | undefined): number | string | undefined {
  if (!raw) return undefined;
  const text = raw
    .split(/<br\s*\/?>|\n/i)
    .map((part) =>
      stripWikiMarkup(part.replace(/^\s*\*+/, ''))
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join(', ');
  if (!/\d/.test(text)) return undefined;
  return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : text;
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(MOB_LIST_PAGE, ctx.client);
  const icons = readMobIcons(list.html);

  const byTitle = new Map<
    string,
    MobIcon & { types: Set<string>; tags: Set<string>; enemy?: boolean }
  >();
  let skipped = 0;
  for (const icon of icons) {
    const labels = icon.path.map((p) => p.toLowerCase());
    if (labels.some((l) => SKIPPED.test(l))) {
      skipped++;
      continue;
    }
    const entry = byTitle.get(icon.title) ?? { ...icon, types: new Set(), tags: new Set() };
    byTitle.set(icon.title, entry);
    if (labels[0] === 'enemies') entry.enemy = true;
    for (const label of labels) {
      const section = SECTION_TYPES[label];
      if (section?.tag) entry.tags.add(section.tag);
    }
    const last = SECTION_TYPES[labels.at(-1) ?? ''];
    if (last?.type) entry.types.add(last.type);
    entry.image ??= icon.image;
  }

  const pages = await getWikitextBatch([...byTitle.keys()], ctx.client);

  // Two icons can point at one page through a redirect ("The Prime Enchanter" is the Prime
  // Enchanter); merge them under the final title.
  const merged = new Map<
    string,
    (typeof icons)[number] & { types: Set<string>; tags: Set<string>; enemy?: boolean }
  >();
  for (const [title, entry] of byTitle) {
    const page = pages.get(title);
    const finalTitle = page && !page.missing ? page.title : stripRedlink(title);
    const into = merged.get(finalTitle);
    if (!into) {
      merged.set(finalTitle, { ...entry, name: bareD2Title(finalTitle), title: finalTitle });
      continue;
    }
    for (const type of entry.types) into.types.add(type);
    for (const tag of entry.tags) into.tags.add(tag);
    into.enemy = into.enemy || entry.enemy;
    into.image ??= entry.image;
  }

  const drafts: Draft[] = [];
  const dropped: DroppedRecord[] = [];
  for (const [finalTitle, entry] of merged) {
    const title = [...byTitle.keys()].find((t) => pages.get(t)?.title === finalTitle) ?? finalTitle;
    if (entry.enemy) entry.types.add('common');
    const type = PRIMARY_ORDER.find((t) => entry.types.has(t)) ?? [...entry.types][0];
    if (!type) continue;
    const slug = slugify(entry.name);
    if (!slug) {
      dropped.push({ name: entry.name, reason: 'name has no usable slug' });
      continue;
    }
    const page = pages.get(title);
    const wikitext = page && !page.missing ? (page.wikitext ?? '') : '';
    const sections = wikiSections(wikitext);
    const info = wikitext ? mobInfobox(wikitext) : undefined;
    const spawning = sections.find((s) => /^spawning$/i.test(s.heading));
    const behaviorAt = sections.findIndex((s) => s.level === 2 && /^behaviou?r$/i.test(s.heading));
    const attacks: string[] = [];
    for (let i = behaviorAt + 1; behaviorAt >= 0 && i < sections.length; i++) {
      const s = sections[i];
      if (!s || s.level <= 2) break;
      if (s.level === 3 && s.heading && !attacks.includes(s.heading)) attacks.push(s.heading);
    }
    const variants = [
      ...new Set(
        Object.entries(info ?? {})
          .filter(([key]) => /^group\d*$/.test(key))
          .map(([, value]) => stripWikiMarkup(value))
          .filter(Boolean),
      ),
    ];
    const draft = d2Draft(
      'mobs',
      entry.name,
      sourceFor(
        page && !page.missing && page.revisionId
          ? {
              title: page.title,
              revisionId: page.revisionId,
              fetchedAt: page.fetchedAt,
              wikitext,
            }
          : undefined,
        list,
      ),
      {
        tags: [...entry.tags].sort(),
        mobType: type,
        attacks,
        locationIds: [],
        drops: [],
        variants,
      },
    );
    const health = healthOf(info?.health);
    if (health !== undefined) draft.health = health;
    if (entry.image) draft._image = entry.image;
    draft._refs = {
      locations: [
        ...new Set([...linkedNames(spawning?.body ?? ''), ...linkedNames(info?.spawn ?? '')]),
      ],
      pageTitle: page?.title ?? title,
    };
    drafts.push(draft);
  }

  return {
    category: 'mobs',
    drafts,
    dropped,
    expected: {
      count: merged.size,
      note: `${merged.size} distinct mobs in the "List of mobs" icon lists; ${skipped} icons under Cinematics/Unused/Supplementary skipped`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
