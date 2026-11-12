import type { CompareRow } from '@/config/categories';
import { formatOne } from '@/components/entity/format';
import type { LabelMap } from '@/lib/filters/options';
import type { CompareCell } from './types';

const NUMERIC = new Set(['decimal', 'int', 'percent', 'seconds']);

/** The lines a cell shows: one line for a plain value, one per item for a list. */
export function cellLines(
  row: CompareRow,
  cell: CompareCell | undefined,
  labels?: LabelMap,
): string[] | undefined {
  if (cell === undefined) return undefined;
  if (Array.isArray(cell)) {
    if (row.format === 'list') return cell;
    return [cell.map((c) => formatOne(c, row.format, row.field, labels)).join(' / ')];
  }
  return [formatOne(cell, row.format, row.field, labels)];
}

/**
 * The columns that hold the best value of a numeric row. Empty when the row has no direction
 * (`better` unset), fewer than two items have a number, or every number is the same, since
 * nothing is "best" then.
 */
export function bestColumns(
  row: CompareRow,
  cells: readonly (CompareCell | undefined)[],
): ReadonlySet<number> {
  const best = new Set<number>();
  if (!row.better || !NUMERIC.has(row.format)) return best;
  const numbers = cells.map((c) => (typeof c === 'number' ? c : undefined));
  const present = numbers.filter((n): n is number => n !== undefined);
  if (present.length < 2 || present.every((n) => n === present[0])) return best;
  const target = row.better === 'high' ? Math.max(...present) : Math.min(...present);
  numbers.forEach((n, i) => {
    if (n === target) best.add(i);
  });
  return best;
}

/** True when at least one item has data for the row. */
export function rowHasData(cells: readonly (CompareCell | undefined)[]): boolean {
  return cells.some((c) => c !== undefined);
}

/** True when the items do not all show the same thing (a missing value differs from a value). */
export function rowDiffers(cells: readonly (CompareCell | undefined)[]): boolean {
  const keys = cells.map((c) => (c === undefined ? '∅' : JSON.stringify(c)));
  return keys.some((k) => k !== keys[0]);
}
