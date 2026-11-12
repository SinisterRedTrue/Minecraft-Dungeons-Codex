import { useEffect, useState } from 'react';
import type { GameId } from '@/config/games';
import type { FlexIndex } from '@/lib/search/engine';
import { loadFlex, peekFlex } from '@/lib/search/loadIndex';

type Loaded =
  | { key: string; flexes: FlexIndex[]; failed?: undefined }
  | { key: string; failed: true; flexes?: undefined };

/**
 * The search indexes of the given games. Indexes already loaded earlier in this page view are
 * returned on the first render (no skeleton flash); a failed download can be retried.
 */
export function usePaletteIndex(games: readonly GameId[]) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const gamesKey = games.join(',');

  const cached = games.map(peekFlex);
  const cachedAll = cached.every((f): f is FlexIndex => f !== undefined) ? cached : null;

  useEffect(() => {
    if (cachedAll) return;
    let cancelled = false;
    const wanted = gamesKey.split(',') as GameId[];
    Promise.all(wanted.map((g) => loadFlex(g))).then(
      (flexes) => {
        if (!cancelled) setLoaded({ key: gamesKey, flexes });
      },
      () => {
        if (!cancelled) setLoaded({ key: gamesKey, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
    // `cachedAll` only says whether to skip; `attempt` re-runs a failed load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesKey, attempt]);

  const flexes = cachedAll ?? (loaded?.key === gamesKey ? (loaded.flexes ?? null) : null);
  const failed = !flexes && loaded?.key === gamesKey && loaded.failed === true;

  return {
    flexes,
    failed,
    retry: () => {
      setLoaded(null);
      setAttempt((n) => n + 1);
    },
  };
}
