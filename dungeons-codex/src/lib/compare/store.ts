import { useCallback, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { GAME_IDS, type GameId } from '@/config/games';
import { createPersistentStore, type PersistentStore } from '@/lib/storage/persistentStore';

/** Compare holds 2–4 items; the 5th add is refused (`[ Plans ]/07-FEATURES-SPEC.md` §3). */
export const MAX_COMPARE = 4;

export const compareKey = (game: GameId) => `dc:compare:${game}`;

/** One comparison per game: items of a single category, in the order they were added. */
export interface CompareState {
  category: string | null;
  slugs: readonly string[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const compareSchema = z.object({
  category: z.string().regex(SLUG),
  slugs: z.array(z.string().regex(SLUG)),
});

export const EMPTY_COMPARE: CompareState = Object.freeze({ category: null, slugs: [] });

/** Whatever is stored → a valid state: bad entries are dropped, at most {@link MAX_COMPARE} kept. */
export function parseCompare(raw: unknown): CompareState {
  const parsed = compareSchema.safeParse(raw);
  if (!parsed.success) return EMPTY_COMPARE;
  const slugs = [...new Set(parsed.data.slugs)].slice(0, MAX_COMPARE);
  return slugs.length === 0 ? EMPTY_COMPARE : { category: parsed.data.category, slugs };
}

const equals = (a: CompareState, b: CompareState) =>
  a.category === b.category &&
  a.slugs.length === b.slugs.length &&
  a.slugs.every((s, i) => s === b.slugs[i]);

export function createCompareStore(game: GameId): PersistentStore<CompareState> {
  return createPersistentStore<CompareState>({
    key: compareKey(game),
    empty: EMPTY_COMPARE,
    parse: parseCompare,
    equals,
  });
}

const stores = Object.fromEntries(GAME_IDS.map((g) => [g, createCompareStore(g)])) as Record<
  GameId,
  PersistentStore<CompareState>
>;

/** The shared store of a game. */
export const compareStore = (game: GameId): PersistentStore<CompareState> => stores[game];

export type AddResult =
  /** Added to the selection. */
  | 'added'
  /** Already in the selection (nothing changed). */
  | 'duplicate'
  /** The selection already holds {@link MAX_COMPARE} items. */
  | 'full'
  /** The selection is of another category; the caller may offer {@link startNew}. */
  | 'other-category';

/** Adds `slug` to the comparison of `category`, unless it is full or of another category. */
export function addToCompare(
  store: PersistentStore<CompareState>,
  category: string,
  slug: string,
): AddResult {
  const state = store.getSnapshot();
  if (state.category !== null && state.category !== category && state.slugs.length > 0) {
    return 'other-category';
  }
  if (state.slugs.includes(slug)) return 'duplicate';
  if (state.slugs.length >= MAX_COMPARE) return 'full';
  store.set({ category, slugs: [...state.slugs, slug] });
  return 'added';
}

export function removeFromCompare(store: PersistentStore<CompareState>, slug: string): void {
  const state = store.getSnapshot();
  if (!state.slugs.includes(slug)) return;
  const slugs = state.slugs.filter((s) => s !== slug);
  store.set(slugs.length === 0 ? EMPTY_COMPARE : { category: state.category, slugs });
}

/** Drops the current selection and starts a new one with this item. */
export function startNewCompare(
  store: PersistentStore<CompareState>,
  category: string,
  slug: string,
): void {
  store.set({ category, slugs: [slug] });
}

/** Replaces the selection (the compare page, after the URL changes). */
export function setCompare(
  store: PersistentStore<CompareState>,
  category: string,
  slugs: readonly string[],
): void {
  const unique = [...new Set(slugs)].slice(0, MAX_COMPARE);
  store.set(unique.length === 0 ? EMPTY_COMPARE : { category, slugs: unique });
}

export function clearCompare(store: PersistentStore<CompareState>): void {
  store.set(EMPTY_COMPARE);
}

/** The whole selection of a game; empty on the server and during hydration. */
export function useCompareState(game: GameId): CompareState {
  const store = compareStore(game);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/** Whether this item is selected for comparison; re-renders only when that flips. */
export function useIsCompared(game: GameId, category: string, slug: string): boolean {
  const store = compareStore(game);
  const get = useCallback(() => {
    const state = store.getSnapshot();
    return state.category === category && state.slugs.includes(slug);
  }, [store, category, slug]);
  return useSyncExternalStore(store.subscribe, get, () => false);
}
