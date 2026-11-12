'use client';

import { createParser, useQueryStates, type UseQueryStatesKeysMap } from 'nuqs';
import { useCallback, useMemo } from 'react';
import type { ViewMode } from '@/components/filters/ViewToggle';
import { sanitizeState, type StatePatch } from '@/lib/filters/state';
import { decodeValue, encodeValue } from '@/lib/filters/url';
import type { FilterDef, FilterState, FilterValue, Item, SortDef } from '@/lib/filters/types';

const SORT_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const same = (a: FilterValue, b: FilterValue): boolean => JSON.stringify(a) === JSON.stringify(b);

/** One nuqs parser per filter param (built on the pure codec in `lib/filters/url.ts`), plus sort, view and grouping. */
function buildKeyMap(defs: readonly FilterDef[], sort: SortDef, groupParam: string | undefined) {
  const map: Record<string, ReturnType<typeof createParser<FilterValue>>> = {};
  for (const def of defs) {
    map[def.param] = createParser<FilterValue>({
      parse: (raw) => decodeValue(def, raw) ?? null,
      serialize: (value) => encodeValue(def, value) ?? '',
      eq: same,
    });
  }
  map[sort.param] = createParser<FilterValue>({
    parse: (raw) => (SORT_VALUE.test(raw) ? raw : null),
    serialize: String,
  });
  map.view = createParser<FilterValue>({
    parse: (raw) => (raw === 'table' ? raw : null),
    serialize: String,
  });
  if (groupParam) {
    map[groupParam] = createParser<FilterValue>({
      parse: (raw) => (raw === '1' ? true : null),
      serialize: () => '1',
    });
  }
  return map as UseQueryStatesKeysMap;
}

export interface BrowserState {
  /** Sanitised filters (unknown options and impossible ranges removed). */
  state: FilterState;
  sortValue: string;
  view: ViewMode;
  grouped: boolean;
  /** Applies a patch of filter params; `push` adds a history entry, `replace` does not. */
  update: (patch: StatePatch, history: 'push' | 'replace') => void;
  setSort: (value: string) => void;
  setView: (view: ViewMode) => void;
  setGrouped: (on: boolean) => void;
}

/**
 * All browser state lives in the URL (nuqs, shallow): filters, sort, view and grouping. Chips and
 * toggles `push` so Back steps through them; slider drags, typing and view changes `replace`.
 */
export function useBrowserState(
  items: readonly Item[],
  defs: readonly FilterDef[],
  sort: SortDef,
  groupParam?: string,
): BrowserState {
  const keyMap = useMemo(() => buildKeyMap(defs, sort, groupParam), [defs, sort, groupParam]);
  const [values, set] = useQueryStates(keyMap, { shallow: true, clearOnDefault: true });

  const raw = JSON.stringify(values);
  const state = useMemo(() => {
    const parsed = JSON.parse(raw) as Record<string, FilterValue | null>;
    const filters: Record<string, FilterValue> = {};
    for (const def of defs) {
      const value = parsed[def.param];
      if (value !== null && value !== undefined) filters[def.param] = value;
    }
    return sanitizeState(items, defs, filters);
  }, [raw, items, defs]);

  const requested = values[sort.param];
  const sortValue =
    typeof requested === 'string' && sort.options.some((o) => o.value === requested)
      ? requested
      : sort.default;

  const update = useCallback(
    (patch: StatePatch, history: 'push' | 'replace') => void set(patch, { history }),
    [set],
  );

  return {
    state,
    sortValue,
    view: values.view === 'table' ? 'table' : 'grid',
    grouped: groupParam ? values[groupParam] === true : false,
    update,
    setSort: (value) =>
      void set({ [sort.param]: value === sort.default ? null : value }, { history: 'push' }),
    setView: (view) =>
      void set({ view: view === 'table' ? 'table' : null }, { history: 'replace' }),
    setGrouped: (on) => {
      if (groupParam) void set({ [groupParam]: on ? true : null }, { history: 'push' });
    },
  };
}
