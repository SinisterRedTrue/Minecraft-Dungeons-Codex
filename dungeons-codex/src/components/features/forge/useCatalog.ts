import { useCallback, useEffect, useState } from 'react';
import { loadCatalog } from '@/lib/forge/catalog';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import type { ForgeProps } from '@/lib/forge/types';

export type CatalogState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; list: ForgeEnchantment[] };

/** Fetches the enchantment catalog of the game once; `retry` tries again after a failure. */
export function useCatalog(game: ForgeProps['game']): { state: CatalogState; retry: () => void } {
  const [state, setState] = useState<CatalogState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadCatalog(game).then(
      (list) => live && setState({ status: 'ready', list }),
      () => live && setState({ status: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [game, attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, retry };
}
