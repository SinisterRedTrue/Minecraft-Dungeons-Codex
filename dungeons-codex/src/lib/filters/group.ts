import { getValues } from './path';
import type { Item } from './types';

export interface ItemGroup<T extends Item> {
  /** The group's field value (e.g. the armor set name). */
  key: string;
  items: T[];
}

/**
 * Groups already-sorted items by `field`, keeping groups in order of first appearance and ordering
 * each group's members by `order.rank` (for example helmet → chestplate → leggings → boots).
 * Items without the field form a final group with an empty key.
 */
export function groupItems<T extends Item>(
  items: readonly T[],
  field: string,
  order?: { field: string; rank: readonly string[] },
): ItemGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = String(getValues(item, field)[0] ?? '');
    const members = groups.get(key);
    if (members) members.push(item);
    else groups.set(key, [item]);
  }
  const sortMembers = (members: T[]): T[] => {
    if (!order) return members;
    const rankOf = (item: T): number => {
      const index = order.rank.indexOf(String(getValues(item, order.field)[0]));
      return index === -1 ? order.rank.length : index;
    };
    return [...members].sort((a, b) => rankOf(a) - rankOf(b));
  };
  const ordered = [...groups].map(([key, members]): ItemGroup<T> => ({
    key,
    items: sortMembers(members),
  }));
  // The "no value" group goes last whatever its first appearance.
  return [...ordered.filter((g) => g.key !== ''), ...ordered.filter((g) => g.key === '')];
}
