/**
 * Build-time data loaders. They read `data/generated/{game}/{category}.json` (validated by
 * `npm run data:validate`) and memoize per file. A missing file is an empty category.
 */
import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GROUP_FIELD, LIST_FIELDS } from '@/config/categories';
import {
  GAMES,
  isValidCategory,
  isValidGame,
  type CategorySlug,
  type GameId,
} from '@/config/games';
import { deriveListFields } from '@/lib/filters/derive';
import { LIST_BASE_FIELDS, type Entity, type EntityListItem, type EntityOf } from '@/lib/schemas';

/** `CODEX_DATA_DIR` (tests) or `<cwd>/data/generated`. */
export function defaultDataDir(): string {
  return process.env.CODEX_DATA_DIR ?? path.join(process.cwd(), 'data', 'generated');
}

export interface Loaders {
  getAll<G extends GameId, C extends CategorySlug<G>>(game: G, category: C): EntityOf<G, C>[];
  getBySlug<G extends GameId, C extends CategorySlug<G>>(
    game: G,
    category: C,
    slug: string,
  ): EntityOf<G, C> | undefined;
  getListItems<G extends GameId, C extends CategorySlug<G>>(game: G, category: C): EntityListItem[];
  /** The list projection of any entities (related grids): the same fields as `getListItems`. */
  toListItems(entities: readonly Entity[]): EntityListItem[];
  getCounts<G extends GameId>(game: G): Record<CategorySlug<G>, number>;
  getRelated(entity: Entity, limit?: number): Entity[];
  getByIds(ids: readonly string[]): Entity[];
  getSyncDate(game: GameId): string | undefined;
}

export function createLoaders(dataDir: string = defaultDataDir()): Loaders {
  const files = new Map<string, Entity[]>();

  function read(game: GameId, category: string): Entity[] {
    const key = `${game}/${category}`;
    const cached = files.get(key);
    if (cached) return cached;
    let entities: Entity[] = [];
    let raw: string | undefined;
    try {
      raw = readFileSync(path.join(dataDir, game, `${category}.json`), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (raw !== undefined) {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error(`${key}.json must contain an array`);
      entities = parsed as Entity[];
    }
    files.set(key, entities);
    return entities;
  }

  const bySlugIndex = new Map<string, Map<string, Entity>>();
  function slugIndex(game: GameId, category: string): Map<string, Entity> {
    const key = `${game}/${category}`;
    let index = bySlugIndex.get(key);
    if (!index) {
      index = new Map(read(game, category).map((e) => [e.slug, e]));
      bySlugIndex.set(key, index);
    }
    return index;
  }

  function byId(id: string): Entity | undefined {
    const [game = '', category = '', slug = ''] = id.split(':');
    if (!isValidGame(game) || !isValidCategory(game, category)) return undefined;
    return slugIndex(game, category).get(slug);
  }

  function projectAll(game: GameId, category: string, entities: readonly Entity[]) {
    return entities.map((entity): EntityListItem => {
      const extra = (LIST_FIELDS[game] as Record<string, readonly string[]>)[category] ?? [];
      const fields = [...LIST_BASE_FIELDS, 'game', 'category', ...extra];
      const raw = entity as unknown as Record<string, unknown>;
      const item: Record<string, unknown> = {};
      for (const field of fields) {
        const value = raw[field];
        if (value !== undefined) item[field] = value;
      }
      // Sums, maxima and parsed effects the filters need (06-FILTERS-SPEC "derived").
      Object.assign(item, deriveListFields(game, category, raw));
      return item as EntityListItem;
    });
  }

  return {
    getAll(game, category) {
      return read(game, category) as EntityOf<typeof game, typeof category>[];
    },

    getBySlug(game, category, slug) {
      return slugIndex(game, category).get(slug) as
        EntityOf<typeof game, typeof category> | undefined;
    },

    getListItems(game, category) {
      return projectAll(game, category, read(game, category));
    },

    toListItems(entities) {
      return entities.flatMap((entity) => projectAll(entity.game, entity.category, [entity]));
    },

    getCounts(game) {
      const counts = {} as Record<CategorySlug<typeof game>, number>;
      for (const category of GAMES[game].categories as readonly CategorySlug<typeof game>[]) {
        counts[category] = read(game, category).length;
      }
      return counts;
    },

    getRelated(entity, limit = 6) {
      const out: Entity[] = [];
      const seen = new Set<string>([entity.id]);
      const add = (candidate: Entity | undefined) => {
        if (!candidate || seen.has(candidate.id)) return;
        seen.add(candidate.id);
        out.push(candidate);
      };
      const e = entity as Entity & { variantIds?: string[]; baseItemId?: string };

      // 1. Variants: own variants, the base item, then the base item's other variants.
      for (const id of e.variantIds ?? []) add(byId(id));
      if (e.baseItemId) {
        const base = byId(e.baseItemId) as typeof e | undefined;
        add(base);
        for (const id of base?.variantIds ?? []) add(byId(id));
      }
      // 2. Explicit relations from the data.
      for (const id of entity.related) add(byId(id));
      // 3. Same group (weapon type, armor group, mob type …), alphabetical.
      const field = (GROUP_FIELD[entity.game] as Record<string, string | undefined>)[
        entity.category
      ];
      const group = field ? (entity as unknown as Record<string, unknown>)[field] : undefined;
      if (field && group !== undefined) {
        for (const other of read(entity.game, entity.category)) {
          if (out.length >= limit) break;
          if ((other as unknown as Record<string, unknown>)[field] === group) add(other);
        }
      }
      return out.slice(0, limit);
    },

    getByIds(ids) {
      return ids.map(byId).filter((e): e is Entity => e !== undefined);
    },

    getSyncDate(game) {
      let latest: string | undefined;
      for (const category of GAMES[game].categories) {
        for (const entity of read(game, category)) {
          const at = entity.source.fetchedAt;
          if (!latest || at > latest) latest = at;
        }
      }
      return latest?.slice(0, 10);
    },
  };
}
