/**
 * D1 mobs: `Dungeons:Mob` is a set of icon lists under headings. Arcade, Unused, Cinematic and
 * concept-art mobs are skipped (D-014). A mob often appears under several headings (a Husk is an
 * Enemy, Undead and Powerful), so the first match in {@link PRIMARY_ORDER} gives `mobType` and the
 * other headings become tags. Each mob page adds health, attacks, drops and spawn locations.
 */
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { slugify } from '@/lib/utils/slugify';
import { getWikitextBatch, parsePageHtml } from '../../wiki/client';
import { fileTitleFromSrc } from '../../wiki/tables';
import { findTemplates, stripWikiMarkup } from '../../wiki/templates';
import { normalizeName } from '../../wiki/text';
import { bareTitle, makeSource, wikiSections } from '../common';
import type { Draft, DroppedRecord, ParseContext, ParseResult } from '../types';

const MOB_PAGE = 'Dungeons:Mob';

/** Heading (lower-case, within "Minecraft Dungeons") → mob type or tag. */
const SECTION_TYPES: Record<string, { type?: string; tag?: string }> = {
  friendlies: { type: 'passive' },
  'cosmetic pets': { type: 'pet' },
  merchants: { type: 'merchant' },
  'neutral mobs': { type: 'neutral' },
  'summonable pets': { type: 'summon' },
  enemies: { type: 'common' },
  blazes: { tag: 'blaze' },
  'ender mobs': { tag: 'ender' },
  illagers: { tag: 'illager' },
  'knockback-immune mobs': { tag: 'knockback-immune' },
  'undead mobs': { tag: 'undead' },
  'powerful mobs': { type: 'powerful' },
  'enchanted endersent': { type: 'enchanted-endersent' },
  ancients: { type: 'ancient' },
  bosses: { type: 'boss' },
  'location hazards': { type: 'hazard' },
  'summoned hazards': { type: 'hazard' },
};

/** Which type wins when a mob is listed under several headings (first match). */
const PRIMARY_ORDER = [
  'boss',
  'ancient',
  'enchanted-endersent',
  'hazard',
  'merchant',
  'pet',
  'summon',
  'powerful',
  'neutral',
  'non-attackable',
  'common',
  'passive',
];

export interface MobIcon {
  title: string;
  name: string;
  image?: string;
  /** Headings above the list, innermost last. */
  path: string[];
}

/** Every `.mob-icon` under "Minecraft Dungeons", with the headings above it. */
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
      if (!$el.is('.mob-icon-list') || path[0] !== 'Minecraft Dungeons') return;
      $el.find('.mob-icon').each((__, icon) => {
        const link = $(icon).find('.mob-name a').first();
        const title = link.attr('title');
        if (!title) return;
        const src = $(icon).find('img').first().attr('src');
        icons.push({
          title,
          name: nameFromTitle(title),
          image: src ? fileTitleFromSrc(src) : undefined,
          path: path.slice(1).filter(Boolean),
        });
      });
    });
  return icons;
}

/** `Dungeons:Tower Keeper (mob)` → `Tower Keeper`; other parentheses stay (`Llama (pet)`). */
export function nameFromTitle(title: string): string {
  return bareTitle(title).replace(/\s*\(mob\)$/i, '');
}

function infobox(wikitext: string): Record<string, string> | undefined {
  return findTemplates(wikitext).find((t) =>
    /^Infobox (?:Dungeons entity|character)$/i.test(t.name),
  )?.params;
}

function healthOf(raw: string | undefined): number | string | undefined {
  if (!raw) return undefined;
  const text = raw
    .split(/<br\s*\/?>/i)
    .map((part) => stripWikiMarkup(part).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(', ');
  // "See Health" and similar pointers are not a value; a real one contains a number.
  if (!/\d/.test(text)) return undefined;
  return /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : text;
}

/** Bullet texts of a wikitext section body. */
function bullets(body: string): string[] {
  return body
    .split('\n')
    .filter((l) => /^\s*\*/.test(l))
    .map((l) => stripWikiMarkup(l.replace(/^\s*\*+/, '')))
    .filter(Boolean);
}

/** Names inside `{{DuLevelLink|X}}` templates of a section body. */
function levelLinks(body: string): string[] {
  return findTemplates(body)
    .filter((t) => /levellink/i.test(t.name))
    .map((t) => stripWikiMarkup(t.params['1'] ?? ''))
    .filter(Boolean);
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(MOB_PAGE, ctx.client);
  const icons = readMobIcons(list.html);

  // One entry per page; every heading it appears under contributes a type or tag.
  const byTitle = new Map<
    string,
    MobIcon & { types: Set<string>; tags: Set<string>; enemy?: boolean }
  >();
  let skipped = 0;
  for (const icon of icons) {
    const labels = icon.path.map((p) => p.toLowerCase());
    if (labels.some((l) => /arcade|unused|cinematic|concept|internal/.test(l))) {
      skipped++;
      continue;
    }
    const entry = byTitle.get(icon.title) ?? { ...icon, types: new Set(), tags: new Set() };
    byTitle.set(icon.title, entry);
    const last = labels.at(-1) ?? '';
    const section = SECTION_TYPES[last];
    if (labels[0] === 'enemies') entry.enemy = true;
    if (labels[0] === 'friendlies' && last === 'non-attackable') entry.types.add('non-attackable');
    else if (labels[0] === 'enemies' && last === 'non-attackable mobs')
      entry.types.add('non-attackable');
    else if (section?.type) entry.types.add(section.type);
    if (section?.tag) entry.tags.add(section.tag);
    entry.image ??= icon.image;
  }

  const pages = await getWikitextBatch([...byTitle.keys()], ctx.client);
  const drafts: Draft[] = [];
  const dropped: DroppedRecord[] = [];
  for (const [title, entry] of byTitle) {
    // Everything under "Enemies" is at least a common enemy, even when it is only listed in a
    // sub-list (a Zombie appears under Undead mobs, not in the plain Enemies list).
    if (entry.enemy) entry.types.add('common');
    const type = PRIMARY_ORDER.find((t) => entry.types.has(t)) ?? [...entry.types][0];
    if (!type) continue;
    const slug = slugify(entry.name) || (/^\?+$/.test(entry.name) ? `unknown-${type}` : '');
    if (!slug) {
      dropped.push({ name: entry.name, reason: 'name has no usable slug' });
      continue;
    }
    const page = pages.get(title);
    const wikitext = page?.wikitext ?? '';
    const sections = wikiSections(wikitext);
    const info = infobox(wikitext);
    const attacksAt = sections.findIndex((s) => s.level === 2 && /^behaviou?r$/i.test(s.heading));
    const attacks: string[] = [];
    for (let i = attacksAt + 1; attacksAt >= 0 && i < sections.length; i++) {
      const s = sections[i];
      if (!s || s.level <= 2) break;
      if (s.level === 3 && s.heading && !attacks.includes(s.heading)) attacks.push(s.heading);
    }
    const drops = bullets(sections.find((s) => /^drops?$/i.test(s.heading))?.body ?? '');
    const spawning = sections.find((s) => /^spawning$/i.test(s.heading));
    const variants = [
      ...new Set(
        Object.entries(info ?? {})
          .filter(([key]) => /^group\d*$/.test(key))
          .map(([, value]) => stripWikiMarkup(value))
          .filter((value) => value && !/arcade/i.test(value)),
      ),
    ];
    const draft: Draft = {
      id: `d1:mobs:${slug}`,
      slug,
      game: 'd1',
      category: 'mobs',
      name: entry.name,
      tags: [...entry.tags].sort(),
      related: [],
      source:
        page && !page.missing && page.revisionId
          ? makeSource(page.title, page.revisionId, page.fetchedAt)
          : makeSource(list.title, list.revisionId, list.fetchedAt),
      quality: 'verified',
      mobType: type,
      attacks,
      locationIds: [],
      drops: [],
      variants,
    };
    const health = healthOf(info?.health);
    if (health !== undefined) draft.health = health;
    if (entry.image) draft._image = entry.image;
    draft._refs = {
      locations: [...new Set(levelLinks(spawning?.body ?? ''))],
      drops,
      pageTitle: page?.title ?? title,
    };
    drafts.push(draft);
  }

  return {
    category: 'mobs',
    drafts,
    dropped,
    expected: {
      count: byTitle.size,
      note: `${byTitle.size} distinct mobs in the Minecraft Dungeons icon lists; ${skipped} icons under Arcade/Unused/Cinematic/concept/internal skipped`,
    },
    notes: [`list page revision ${list.revisionId}`],
  };
}
