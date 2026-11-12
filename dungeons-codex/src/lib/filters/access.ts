/** Reads of the filter state, and which filters are shown. */
import type { FilterDef, FilterState, FilterValue, RangeDef } from './types';

// State accessors: the state is ours, but a URL-derived value may still have the wrong type ---

export const stateString = (v: FilterValue | undefined): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;
export const stateList = (v: FilterValue | undefined): readonly string[] =>
  Array.isArray(v) ? (v as readonly string[]) : [];
export const stateRange = (v: FilterValue | undefined): readonly [number, number] | undefined => {
  if (!Array.isArray(v) || v.length !== 2) return undefined;
  const [lo, hi] = v as readonly unknown[];
  return typeof lo === 'number' && typeof hi === 'number' ? ([lo, hi] as const) : undefined;
};

/** Whether `def` takes part in filtering and is visible, given the other filters' state. */
export function isShown(def: FilterDef, state: FilterState): boolean {
  if (def.showWhen) {
    const current = stateString(state[def.showWhen.param]);
    const allowed = [def.showWhen.equals].flat();
    if (current === undefined || !allowed.includes(current)) return false;
  }
  if (def.kind === 'range' && def.dependsOn) return stateList(state[def.dependsOn]).length === 1;
  return true;
}

/** The concrete field of a range def: `{value}` is filled from the controlling multi. */
export function rangeField(def: RangeDef, state: FilterState): string {
  if (!def.dependsOn) return def.field;
  return def.field.replace('{value}', stateList(state[def.dependsOn])[0] ?? '');
}
