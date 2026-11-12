'use client';

import { useCallback, useMemo, useState } from 'react';
import { sanitizeState, type StatePatch } from '@/lib/filters/state';
import type { FilterDef, FilterState, FilterValue, Item, SortDef } from '@/lib/filters/types';

export interface LocalBrowserState {
  /** Sanitised filters (unknown options and impossible ranges removed). */
  state: FilterState;
  sortValue: string;
  update: (patch: StatePatch, history?: 'push' | 'replace') => void;
  setSort: (value: string) => void;
}

/**
 * The same state as `useBrowserState`, kept in React instead of the URL. The Build Planner's
 * item picker uses it: its filters must not leak into the `?b=` share link, and they start
 * fresh every time the picker opens.
 */
export function useLocalBrowserState(
  items: readonly Item[],
  defs: readonly FilterDef[],
  sort: SortDef,
): LocalBrowserState {
  const [raw, setRaw] = useState<Record<string, FilterValue>>({});
  const [requested, setRequested] = useState(sort.default);

  const state = useMemo(() => sanitizeState(items, defs, raw), [items, defs, raw]);
  const update = useCallback((patch: StatePatch) => {
    setRaw((current) => {
      const merged: Record<string, FilterValue | null> = { ...current, ...patch };
      return Object.fromEntries(
        Object.entries(merged).filter((entry): entry is [string, FilterValue] => entry[1] !== null),
      );
    });
  }, []);

  const sortValue = sort.options.some((o) => o.value === requested) ? requested : sort.default;
  return { state, sortValue, update, setSort: setRequested };
}
