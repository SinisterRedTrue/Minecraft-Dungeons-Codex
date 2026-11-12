/** Range bounds: the min/max of a numeric field, widened to the slider step. */
import { numbersOf } from './cache';
import type { Bounds, Item } from './types';

const boundsCache = new WeakMap<readonly Item[], Map<string, Bounds | null>>();

const decimalsOf = (step: number): number => (String(step).split('.')[1] ?? '').length;
const roundTo = (n: number, decimals: number): number => Number(n.toFixed(decimals));

/**
 * Min/max of the numbers at `field`, widened to the slider step so every item is reachable.
 * `null` when no item has the field.
 */
export function boundsFor(items: readonly Item[], field: string, step: number): Bounds | null {
  let perList = boundsCache.get(items);
  if (!perList) {
    perList = new Map();
    boundsCache.set(items, perList);
  }
  const key = `${field}|${step}`;
  if (perList.has(key)) return perList.get(key) ?? null;
  let min = Infinity;
  let max = -Infinity;
  for (const item of items) {
    for (const n of numbersOf(item, field)) {
      if (n < min) min = n;
      if (n > max) max = n;
    }
  }
  const digits = decimalsOf(step);
  const bounds =
    min === Infinity
      ? null
      : {
          min: roundTo(Math.floor(roundTo(min / step, 6)) * step, digits),
          max: roundTo(Math.ceil(roundTo(max / step, 6)) * step, digits),
        };
  perList.set(key, bounds);
  return bounds;
}

/** True when the range value narrows the full bounds. */
export function isNarrowed(value: readonly [number, number], bounds: Bounds): boolean {
  return value[0] > bounds.min || value[1] < bounds.max;
}
