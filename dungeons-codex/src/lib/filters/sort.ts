/** Sorting of filtered results. */
import { getValues } from './path';
import type { Item, SortDef, SortKey } from './types';

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** Sorted copy. Items missing the sort field go last in either direction; ties fall back to name. */
export function sortItems<T extends Item>(
  items: readonly T[],
  sort: SortDef,
  value: string | undefined,
): T[] {
  const option =
    sort.options.find((o) => o.value === value) ??
    sort.options.find((o) => o.value === sort.default);
  const byName = (a: T, b: T): number =>
    collator.compare(String(a.name), String(b.name)) ||
    collator.compare(String(a.id), String(b.id));
  if (!option) return [...items].sort(byName);
  const keys: readonly SortKey[] = [option, ...(option.then ?? [])];
  const keyOf = (item: T, key: SortKey): number | string | undefined => {
    const v = getValues(item, key.field)[0];
    if (v === undefined) return undefined;
    if (key.rank) return key.rank.indexOf(String(v));
    return typeof v === 'number' ? v : String(v);
  };
  const compareBy = (a: T, b: T, key: SortKey): number => {
    const ka = keyOf(a, key);
    const kb = keyOf(b, key);
    // Items missing the field go last in either direction.
    if (ka === undefined || kb === undefined) {
      if (ka === kb) return 0;
      return ka === undefined ? 1 : -1;
    }
    const diff =
      typeof ka === 'number' && typeof kb === 'number'
        ? ka - kb
        : collator.compare(`${ka}`, `${kb}`);
    return (key.dir === 'asc' ? 1 : -1) * diff;
  };
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const result = compareBy(a, b, key);
      if (result !== 0) return result;
    }
    return byName(a, b);
  });
}
