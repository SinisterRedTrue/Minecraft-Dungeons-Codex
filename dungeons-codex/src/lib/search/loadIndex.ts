import type { GameId } from '@/config/games';
import { buildFlex, type FlexIndex } from './engine';
import type { SearchEntry } from './types';

const entries = new Map<GameId, Promise<SearchEntry[]>>();
const flexes = new Map<GameId, FlexIndex>();

/**
 * Fetches `/search/{game}.json` once and keeps it in module memory. A failed fetch is not
 * cached, so closing and reopening the palette (or pressing Retry) tries again.
 */
export function loadIndex(game: GameId, fetchFn: typeof fetch = fetch): Promise<SearchEntry[]> {
  let promise = entries.get(game);
  if (!promise) {
    const fresh = fetchFn(`/search/${game}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Search index for ${game} returned ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(`Search index for ${game} is not a list`);
        return data as SearchEntry[];
      });
    entries.set(game, fresh);
    fresh.catch(() => {
      if (entries.get(game) === fresh) entries.delete(game);
    });
    promise = fresh;
  }
  return promise;
}

/** The ready-to-query index of a game: loads the entries, builds FlexSearch once, reuses it. */
export async function loadFlex(game: GameId, fetchFn?: typeof fetch): Promise<FlexIndex> {
  const cached = flexes.get(game);
  if (cached) return cached;
  const built = buildFlex(await loadIndex(game, fetchFn));
  flexes.set(game, built);
  return built;
}

/** The index of a game when it has already been loaded and built in this page view. */
export function peekFlex(game: GameId): FlexIndex | undefined {
  return flexes.get(game);
}

/** Forgets everything loaded (tests). */
export function resetSearchCache(): void {
  entries.clear();
  flexes.clear();
}
