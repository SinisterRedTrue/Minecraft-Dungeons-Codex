import { useCallback, useSyncExternalStore } from 'react';
import { createPersistentStore, type PersistentStore } from '@/lib/storage/persistentStore';

/** `[ Plans ]/07-FEATURES-SPEC.md` §4: a JSON `string[]` of entity ids (`game:category:slug`). */
export const FAVORITES_KEY = 'dc:favorites:v1';

/** An entity id such as `d1:weapons:claymore`. Plain checks, not Zod: this module is in every page's JS. */
export const ENTITY_ID = /^d[12]:[a-z]+:[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type FavoriteIds = readonly string[];

const EMPTY: FavoriteIds = Object.freeze([]);

/**
 * Migration hook: turns whatever is stored under any known past or future version into the
 * current list. v1 is a plain array; entries that are not valid ids are dropped (never the
 * whole list) and duplicates are removed. Unknown shapes become an empty list.
 *
 * When a v2 shape exists, read the v2 key first and fall back to this function for v1 data.
 */
export function migrateFavorites(raw: unknown): FavoriteIds {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'object' &&
        raw !== null &&
        Array.isArray((raw as { favorites?: unknown }).favorites)
      ? (raw as { favorites: unknown[] }).favorites
      : [];
  const ids: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && ENTITY_ID.test(item) && !ids.includes(item)) ids.push(item);
  }
  return ids.length === 0 ? EMPTY : ids;
}

export function createFavoritesStore(): PersistentStore<FavoriteIds> {
  return createPersistentStore<FavoriteIds>({
    key: FAVORITES_KEY,
    empty: EMPTY,
    parse: migrateFavorites,
  });
}

/** The one store the app shares. */
export const favoritesStore: PersistentStore<FavoriteIds> = createFavoritesStore();

/** Adds or removes `id`; returns whether it is a favorite afterwards. */
export function toggleFavorite(id: string, store = favoritesStore): boolean {
  const current = store.getSnapshot();
  if (current.includes(id)) {
    store.set(current.filter((x) => x !== id));
    return false;
  }
  store.set([...current, id]);
  return true;
}

/** Merge keeps the current list and appends the new ids; replace swaps it. */
export function importFavorites(
  ids: FavoriteIds,
  mode: 'merge' | 'replace',
  store = favoritesStore,
): void {
  const next =
    mode === 'replace' ? [...new Set(ids)] : [...new Set([...store.getSnapshot(), ...ids])];
  store.set(next.length === 0 ? EMPTY : next);
}

export function clearFavorites(store = favoritesStore): void {
  store.set(EMPTY);
}

/** Every favorite id; empty on the server and during hydration. */
export function useFavorites(): FavoriteIds {
  return useSyncExternalStore(
    favoritesStore.subscribe,
    favoritesStore.getSnapshot,
    favoritesStore.getServerSnapshot,
  );
}

/** How many favorites there are. */
export function useFavoritesCount(): number {
  return useSyncExternalStore(
    favoritesStore.subscribe,
    () => favoritesStore.getSnapshot().length,
    () => 0,
  );
}

/** `[isFavorite, toggle]` for one id; re-renders only when that id flips. */
export function useIsFavorite(id: string): [boolean, () => boolean] {
  const is = useSyncExternalStore(
    favoritesStore.subscribe,
    () => favoritesStore.getSnapshot().includes(id),
    () => false,
  );
  const toggle = useCallback(() => toggleFavorite(id), [id]);
  return [is, toggle];
}
