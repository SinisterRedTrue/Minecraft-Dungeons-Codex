/** Per-item memo caches shared by the filter engine: tokens, numbers and search text. */
import { getNumbers, getValues } from './path';
import { toToken } from './tokens';
import type { Item } from './types';

const tokenCache = new WeakMap<object, Map<string, string[]>>();
const numberCache = new WeakMap<object, Map<string, number[]>>();
export const textCache = new WeakMap<object, Map<string, string>>();

export function memo<T>(
  store: WeakMap<object, Map<string, T>>,
  item: object,
  key: string,
  compute: () => T,
): T {
  let perItem = store.get(item);
  if (!perItem) {
    perItem = new Map();
    store.set(item, perItem);
  }
  const hit = perItem.get(key);
  if (hit !== undefined) return hit;
  const value = compute();
  perItem.set(key, value);
  return value;
}

/** The tokens of every value at `field` (cached per item). */
export function tokensOf(item: Item, field: string): string[] {
  return memo(tokenCache, item, field, () => getValues(item, field).map(toToken));
}

export function numbersOf(item: Item, field: string): number[] {
  return memo(numberCache, item, field, () => getNumbers(item, field));
}
