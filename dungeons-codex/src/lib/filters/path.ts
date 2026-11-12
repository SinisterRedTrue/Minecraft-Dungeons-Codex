/**
 * The field-path DSL (`[ Plans ]/06-FILTERS-SPEC.md`): `a.b` walks properties, and
 * `arr[key=value].prop` keeps only the elements of `arr` whose `key` equals `value`. Arrays are
 * flattened, so `builtInEnchantments.enchantmentId` yields every id in the list.
 *
 * The `[key=value]` comparison goes through {@link toToken}, so `effects[label=movement-speed]`
 * also finds "Movement Speed" (and `{value}` placeholders can carry a URL token).
 */
import { toToken } from './tokens';

interface Segment {
  key: string;
  where?: { key: string; value: string };
}

const SEGMENT = /^(\w+)(?:\[(\w+)=([^\]]*)\])?$/;
const cache = new Map<string, readonly Segment[]>();

/** Splits on dots that are outside `[...]`, so a filter value may contain a dot. */
function splitSegments(path: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of path) {
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (char === '.' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

export function parsePath(path: string): readonly Segment[] {
  const cached = cache.get(path);
  if (cached) return cached;
  const segments = splitSegments(path).map((part): Segment => {
    const match = SEGMENT.exec(part);
    if (!match) throw new Error(`Invalid field path "${path}" (at "${part}")`);
    const [, key = '', whereKey, whereValue] = match;
    return whereKey === undefined || whereValue === undefined
      ? { key }
      : { key, where: { key: whereKey, value: whereValue } };
  });
  cache.set(path, segments);
  return segments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Every value at `path`, flattened; missing, `null` and `undefined` leave no entry. */
export function getValues(item: unknown, path: string): unknown[] {
  let current: unknown[] = [item];
  for (const { key, where } of parsePath(path)) {
    const next: unknown[] = [];
    for (const node of current) {
      if (!isRecord(node)) continue;
      const found = node[key];
      if (found === undefined || found === null) continue;
      for (const element of Array.isArray(found) ? found : [found]) {
        if (element === undefined || element === null) continue;
        if (where) {
          if (!isRecord(element) || toToken(element[where.key]) !== toToken(where.value)) continue;
        }
        next.push(element);
      }
    }
    current = next;
  }
  return current;
}

/** The numeric values at `path` (finite numbers only). */
export function getNumbers(item: unknown, path: string): number[] {
  return getValues(item, path).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
}
