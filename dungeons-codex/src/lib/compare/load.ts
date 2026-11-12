import type { GameId } from '@/config/games';
import type { CompareEntry } from './types';

const files = new Map<string, Promise<CompareEntry[]>>();

const compareFileUrl = (game: GameId, category: string) => `/compare/${game}/${category}.json`;

/**
 * Fetches `/compare/{game}/{category}.json` once per page view. A failed fetch is not cached,
 * so choosing the category again (or pressing Retry) tries again.
 */
export function loadCompare(
  game: GameId,
  category: string,
  fetchFn: typeof fetch = fetch,
): Promise<CompareEntry[]> {
  const key = `${game}/${category}`;
  let promise = files.get(key);
  if (!promise) {
    const fresh = fetchFn(compareFileUrl(game, category))
      .then((res) => {
        if (!res.ok) throw new Error(`Compare data for ${key} returned ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(`Compare data for ${key} is not a list`);
        return data as CompareEntry[];
      });
    files.set(key, fresh);
    fresh.catch(() => {
      if (files.get(key) === fresh) files.delete(key);
    });
    promise = fresh;
  }
  return promise;
}

/** Forgets everything loaded (tests). */
export function resetCompareCache(): void {
  files.clear();
}
