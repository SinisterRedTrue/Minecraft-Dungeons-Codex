/**
 * Entity references for detail pages. The data stores links as entity ids
 * (`d1:locations:creeper-woods`), as bare slugs that name an entity (`dlc: "hidden-depths"`,
 * `weaponType: "anchor"`) and as raw wiki text when a name did not resolve. These helpers find
 * every id an entity mentions (so the server can fetch them in one go) and turn a value into
 * something a component can render: a label, plus a link when the target exists.
 */
import type { GameId } from '@/config/games';
import { humanize, isEntityId, sentenceCase, toToken } from '@/lib/filters/tokens';
import type { Entity } from '@/lib/schemas';

export interface EntityRef {
  id: string;
  game: GameId;
  category: string;
  slug: string;
  name: string;
  href: string;
  imageSrc?: string;
  rarity?: string;
}

/** Ids → what a link to that entity needs. */
export type Refs = Readonly<Record<string, EntityRef>>;

/** A piece of text, linked when it names an entity. */
export interface LinkValue {
  label: string;
  href?: string;
  /** The ref behind the link, so grids can show its icon. */
  ref?: EntityRef;
}

export function refOf(entity: Entity): EntityRef {
  return {
    id: entity.id,
    game: entity.game,
    category: entity.category,
    slug: entity.slug,
    name: entity.name,
    href: `/${entity.game}/${entity.category}/${entity.slug}`,
    ...(entity.image ? { imageSrc: entity.image.src } : {}),
    ...(entity.rarity ? { rarity: entity.rarity } : {}),
  };
}

/** Keys that hold ids which are not links to show: the entity itself, its sources, its tags. */
const SKIP_KEYS = new Set(['id', 'source', 'image', 'overrides', 'related', 'tags']);

/** Every entity id found anywhere inside `value` (nested objects and arrays included). */
export function collectIds(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') {
    if (isEntityId(value)) out.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectIds(item, out);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (!SKIP_KEYS.has(key)) collectIds(item, out);
    }
  }
  return out;
}

/** Fields whose bare slug names another entity, and the category that entity lives in. */
const SLUG_FIELDS: Readonly<Record<string, 'dlcs' | 'self'>> = {
  dlc: 'dlcs',
  weaponType: 'self',
  armorGroup: 'self',
};

/** The id a bare slug stands for, e.g. `dlc: "hidden-depths"` → `d1:dlcs:hidden-depths`. */
export function slugToId(
  game: GameId,
  category: string,
  kind: 'dlcs' | 'self',
  slug: string,
): string {
  return `${game}:${kind === 'self' ? category : 'dlcs'}:${toToken(slug)}`;
}

/** Ids for the slug-valued fields of an entity (candidates: they may not exist). */
export function slugIds(entity: Entity): string[] {
  const record = entity as unknown as Record<string, unknown>;
  const out: string[] = [];
  for (const [field, kind] of Object.entries(SLUG_FIELDS)) {
    const value = record[field];
    if (typeof value === 'string' && value !== '') {
      out.push(slugToId(entity.game, entity.category, kind, value));
    }
  }
  return out;
}

/**
 * A label (and link) for one stored value: an entity id that resolved, an id that did not (its
 * slug, spelled out), or raw wiki text as written.
 */
export function toLink(value: unknown, refs: Refs): LinkValue {
  const text = String(value);
  if (isEntityId(text)) {
    const ref = refs[text];
    return ref ? { label: ref.name, href: ref.href, ref } : { label: humanize(toToken(text)) };
  }
  return { label: sentenceCase(text.trim()) };
}

/** Like {@link toLink} for a bare slug naming an entity of `kind`, falling back to the slug spelled out. */
export function slugLink(
  game: GameId,
  category: string,
  kind: 'dlcs' | 'self',
  value: unknown,
  refs: Refs,
): LinkValue {
  const ref = refs[slugToId(game, category, kind, String(value))];
  return ref ? { label: ref.name, href: ref.href, ref } : { label: humanize(toToken(value)) };
}
