import { normalize } from './normalize';
import type { IndexableEntity, SearchEntry } from './types';

/** `data/vocab/aliases.json`: `category:slug` → abbreviations. Applies to every game that has the entity. */
export type AliasVocab = Readonly<Record<string, readonly string[]>>;

/**
 * Extra names for one entity: the name with its hyphens closed up ("Multi-Roll" → "MultiRoll"),
 * the slug's words when the name has no letters at all ("???"), and the hand-written
 * abbreviations. Apostrophes need no alias: the search normaliser already drops them from names
 * and queries alike, so "hunters" finds "Hunter's". Aliases that equal the name once normalised
 * are dropped.
 */
export function aliasesFor(
  entity: Pick<IndexableEntity, 'category' | 'slug' | 'name'>,
  vocab: AliasVocab = {},
): string[] {
  const found: string[] = [];
  const { name } = entity;
  if (/\p{L}-\p{L}/u.test(name)) found.push(name.replace(/-/g, ''));
  if (normalize(name) === '') found.push(entity.slug.replace(/-/g, ' '));
  found.push(...(vocab[`${entity.category}:${entity.slug}`] ?? []));
  const own = normalize(name);
  const seen = new Set<string>([own]);
  return found.filter((alias) => {
    const key = normalize(alias);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toSearchEntry(entity: IndexableEntity, vocab: AliasVocab = {}): SearchEntry {
  const entry: SearchEntry = {
    id: entity.id,
    g: entity.game,
    c: entity.category,
    s: entity.slug,
    n: entity.name,
    a: aliasesFor(entity, vocab),
    t: [...entity.tags],
  };
  if (entity.rarity) entry.r = entity.rarity;
  if (entity.image) entry.i = entity.image.src;
  return entry;
}

/** One game's index, in the order of the input (the data files are already in a stable order). */
export function buildSearchIndex(
  entities: readonly IndexableEntity[],
  vocab: AliasVocab = {},
): SearchEntry[] {
  return entities.map((e) => toSearchEntry(e, vocab));
}

/** Alias keys that match no entity of any game, so a renamed entity cannot leave a dead abbreviation behind. */
export function unknownAliasKeys(
  all: readonly Pick<IndexableEntity, 'category' | 'slug'>[],
  vocab: AliasVocab,
): string[] {
  const keys = new Set(all.map((e) => `${e.category}:${e.slug}`));
  return Object.keys(vocab).filter((key) => !keys.has(key));
}
