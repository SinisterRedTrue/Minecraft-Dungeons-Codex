/** Sorting of filtered results. */
import { getValues } from './path';
import type { Item, SortDef } from './types';

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
  const sign = option.dir === 'asc' ? 1 : -1;
  const keyOf = (item: T): number | string | undefined => {
    const v = getValues(item, option.field)[0];
    if (v === undefined) return undefined;
    if (option.rank) return option.rank.indexOf(String(v));
    return typeof v === 'number' ? v : String(v);
  };
  return [...items].sort((a, b) => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (ka === undefined || kb === undefined) {
      if (ka === kb) return byName(a, b);
      return ka === undefined ? 1 : -1;
    }
    const diff =
      typeof ka === 'number' && typeof kb === 'number'
        ? ka - kb
        : collator.compare(`${ka}`, `${kb}`);
    return diff === 0 ? byName(a, b) : sign * diff;
  });
}
