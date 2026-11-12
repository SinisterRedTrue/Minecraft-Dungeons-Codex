import type { AnyCategorySlug, GameId } from '@/config/games';

/**
 * One search-index entry. Keys are short on purpose: the index is fetched by the browser and the
 * size target is 60 kB gzip per game (`[ Plans ]/07-FEATURES-SPEC.md` §1).
 */
export interface SearchEntry {
  /** Entity id, `game:category:slug`. */
  id: string;
  g: GameId;
  c: AnyCategorySlug;
  s: string;
  /** Display name. */
  n: string;
  /** Extra searchable names: name without punctuation, abbreviations. */
  a: string[];
  /** Tags as written in the data (kebab-case). */
  t: string[];
  /** Rarity, when the entity has one. */
  r?: string;
  /** Self-hosted image path. */
  i?: string;
}

/** The fields of an entity the index reads (a subset of the schemas). */
export interface IndexableEntity {
  id: string;
  game: GameId;
  category: AnyCategorySlug;
  slug: string;
  name: string;
  tags: readonly string[];
  rarity?: string;
  image?: { src: string };
}

/** Which field of an entry matched. */
export type MatchField = 'name' | 'alias' | 'tag';

export interface SearchHit {
  entry: SearchEntry;
  score: number;
  field: MatchField;
  /** True when the match needed the edit-distance pass (a typo). */
  fuzzy: boolean;
}

export interface SearchGroup {
  /** `game:category`, unique across both games. */
  key: string;
  game: GameId;
  category: AnyCategorySlug;
  /** Best score in the group; groups are ordered by it. */
  score: number;
  hits: SearchHit[];
}

export const entryHref = (e: Pick<SearchEntry, 'g' | 'c' | 's'>): string => `/${e.g}/${e.c}/${e.s}`;
