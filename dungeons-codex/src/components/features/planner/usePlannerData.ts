'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameId } from '@/config/games';
import { catalogMap, loadCatalog } from '@/lib/forge/catalog';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import type { Known } from '@/lib/planner/codec';
import { indexPlanner, loadPlanner, makeKnown, type PlannerData } from '@/lib/planner/data';

export interface PlannerLoaded {
  data: PlannerData;
  catalog: ForgeEnchantment[];
  catalogBySlug: Map<string, ForgeEnchantment>;
  known: Known;
}

export type PlannerLoad =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | ({ status: 'ready' } & PlannerLoaded);

type Raw =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; file: Awaited<ReturnType<typeof loadPlanner>>; catalog: ForgeEnchantment[] };

/**
 * Fetches the planner data file and the enchantment catalog of a game (both once per page view;
 * a failed fetch is not cached, so Retry fetches again).
 */
export function usePlannerData(game: GameId): PlannerLoad {
  const [raw, setRaw] = useState<Raw>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPlanner(game), loadCatalog(game)]).then(
      ([file, catalog]) => !cancelled && setRaw({ status: 'ready', file, catalog }),
      () => !cancelled && setRaw({ status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [game, attempt]);

  const retry = useCallback(() => {
    setRaw({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return useMemo((): PlannerLoad => {
    if (raw.status === 'loading') return raw;
    if (raw.status === 'error') return { status: 'error', retry };
    const data = indexPlanner(raw.file);
    return {
      status: 'ready',
      data,
      catalog: raw.catalog,
      catalogBySlug: catalogMap(raw.catalog),
      known: makeKnown(data, raw.catalog),
    };
  }, [raw, retry]);
}
