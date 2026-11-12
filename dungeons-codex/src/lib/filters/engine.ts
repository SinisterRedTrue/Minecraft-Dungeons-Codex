/**
 * Pure filter engine: `applyFilters`, `facetCounts`, `sortItems`, range bounds and the
 * missing-field rule (`[ Plans ]/06-FILTERS-SPEC.md`). No React, no I/O; items are plain objects.
 *
 * A def is *shown* when its `showWhen` holds (and, for a dependent range, exactly one value of
 * the controlling multi is chosen). Hidden defs never filter, whatever the URL says.
 */
import { isShown, rangeField, stateList, stateRange, stateString } from './access';
import { boundsFor, isNarrowed } from './bounds';
import { memo, numbersOf, textCache, tokensOf } from './cache';
import { getValues } from './path';
import { sortItems } from './sort';
import { toToken } from './tokens';
import type {
  Bounds,
  FacetCounts,
  FilterDef,
  FilterState,
  Item,
  MultiDef,
  RangeDef,
  TextDef,
  ToggleDef,
  TypeDef,
} from './types';

export {
  boundsFor,
  isNarrowed,
  isShown,
  rangeField,
  sortItems,
  stateList,
  stateRange,
  stateString,
  tokensOf,
};

/** Key under each filter in {@link facetCounts} that holds "all results without this filter". */
export const FACET_ALL = '*';

type Matcher = (item: Item) => boolean;

/** Bounds for a range def in the current state; `null` when it has no data (or no field yet). */
export function rangeBounds(
  items: readonly Item[],
  def: RangeDef,
  state: FilterState,
): Bounds | null {
  return isShown(def, state) ? boundsFor(items, rangeField(def, state), def.step) : null;
}

// --- matchers ---

function typeMatcher(def: TypeDef, state: FilterState): Matcher | null {
  const wanted = stateString(state[def.param]);
  return wanted === undefined ? null : (item) => tokensOf(item, def.field).includes(wanted);
}

function multiMatcher(def: MultiDef, state: FilterState): Matcher | null {
  const wanted = stateList(state[def.param]);
  if (wanted.length === 0) return null;
  const none = def.noneOption?.value;
  const has = (item: Item, token: string): boolean => {
    const tokens = tokensOf(item, def.field);
    return token === none ? tokens.length === 0 : tokens.includes(token);
  };
  return def.match === 'all'
    ? (item) => wanted.every((t) => has(item, t))
    : (item) => wanted.some((t) => has(item, t));
}

function toggleMatcher(def: ToggleDef, state: FilterState): Matcher | null {
  const on = state[def.param] === true;
  const wanted = toToken(def.value);
  if (def.hiddenUntilOn) return on ? null : (item) => !tokensOf(item, def.field).includes(wanted);
  return on ? (item) => tokensOf(item, def.field).includes(wanted) : null;
}

function rangeMatcher(items: readonly Item[], def: RangeDef, state: FilterState): Matcher | null {
  const value = stateRange(state[def.param]);
  const field = rangeField(def, state);
  const bounds = boundsFor(items, field, def.step);
  if (!value || !bounds || !isNarrowed(value, bounds)) return null;
  const [lo, hi] = value;
  // Items without the stat are excluded once the range is narrowed (06-FILTERS-SPEC).
  return (item) => numbersOf(item, field).some((n) => n >= lo && n <= hi);
}

const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .replace(/['‘’`]/g, '')
    .replace(/[-_]/g, ' ');

function textMatcher(def: TextDef, state: FilterState): Matcher | null {
  const query = stateString(state[def.param]);
  const words = query === undefined ? [] : normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const fieldsKey = def.fields.join('|');
  const haystack = (item: Item): string =>
    memo(textCache, item, fieldsKey, () =>
      normalizeText(def.fields.flatMap((f) => getValues(item, f)).join(' ')),
    );
  return (item) => words.every((w) => haystack(item).includes(w));
}

function compile(items: readonly Item[], def: FilterDef, state: FilterState): Matcher | null {
  switch (def.kind) {
    case 'type':
      return typeMatcher(def, state);
    case 'multi':
      return multiMatcher(def, state);
    case 'toggle':
      return toggleMatcher(def, state);
    case 'range':
      return rangeMatcher(items, def, state);
    case 'text':
      return textMatcher(def, state);
  }
}

interface Compiled {
  def: FilterDef;
  match: Matcher | null;
}

function compileShown(items: readonly Item[], defs: readonly FilterDef[], state: FilterState) {
  return defs
    .filter((def) => isShown(def, state))
    .map((def): Compiled => ({ def, match: compile(items, def, state) }));
}

/** Items that satisfy every shown filter. */
export function applyFilters<T extends Item>(
  items: readonly T[],
  defs: readonly FilterDef[],
  state: FilterState,
): T[] {
  const matchers = compileShown(items, defs, state).flatMap((c) => (c.match ? [c.match] : []));
  return matchers.length === 0
    ? [...items]
    : items.filter((item) => matchers.every((match) => match(item)));
}

// --- facet counts ---

/**
 * For every shown type/multi filter: how many results each option would give with all *other*
 * filters applied. `[FACET_ALL]` is the result count without that filter. Level-1 types also
 * ignore the level-2 types (a Daggers selection must not zero out the Ranged chip), and an
 * `all` multi keeps its own selection (picking another option narrows it further).
 */
export function facetCounts(
  items: readonly Item[],
  defs: readonly FilterDef[],
  state: FilterState,
): FacetCounts {
  const compiled = compileShown(items, defs, state);
  const failed = items.map((item) =>
    compiled.reduce(
      (mask, c, index) => (c.match && !c.match(item) ? mask | (1 << index) : mask),
      0,
    ),
  );
  const out: FacetCounts = {};
  compiled.forEach(({ def }, index) => {
    if (def.kind !== 'type' && def.kind !== 'multi') return;
    let ignore = def.kind === 'multi' && def.match === 'all' ? 0 : 1 << index;
    if (def.kind === 'type' && def.level === 1) {
      compiled.forEach((other, i) => {
        if (other.def.kind === 'type' && other.def.level === 2) ignore |= 1 << i;
      });
    }
    const none = def.kind === 'multi' ? def.noneOption?.value : undefined;
    const counts: Record<string, number> = {};
    let total = 0;
    items.forEach((item, i) => {
      if (((failed[i] as number) & ~ignore) !== 0) return;
      total += 1;
      const tokens = new Set(tokensOf(item, def.field));
      if (tokens.size === 0 && none !== undefined) counts[none] = (counts[none] ?? 0) + 1;
      for (const token of tokens) counts[token] = (counts[token] ?? 0) + 1;
    });
    counts[FACET_ALL] = total;
    out[def.key] = counts;
  });
  return out;
}

/**
 * How many items a narrowed range hides only because they lack the stat (counted among the
 * items every other filter lets through).
 */
export function countMissing(
  items: readonly Item[],
  defs: readonly FilterDef[],
  state: FilterState,
  rangeDef: RangeDef,
): number {
  const field = rangeField(rangeDef, state);
  const others = compileShown(items, defs, state)
    .filter((c) => c.def !== rangeDef)
    .flatMap((c) => (c.match ? [c.match] : []));
  return items.filter(
    (item) => numbersOf(item, field).length === 0 && others.every((match) => match(item)),
  ).length;
}

// --- state summaries ---

/** Number of filters the user has set (a multi counts once, a full-bounds range not at all). */
export function countActive(
  items: readonly Item[],
  defs: readonly FilterDef[],
  state: FilterState,
): number {
  return defs.filter((def) => {
    if (!isShown(def, state)) return false;
    const v = state[def.param];
    switch (def.kind) {
      case 'type':
      case 'text':
        return stateString(v) !== undefined;
      case 'multi':
        return stateList(v).length > 0;
      case 'toggle':
        return v === true;
      case 'range': {
        const value = stateRange(v);
        const bounds = boundsFor(items, rangeField(def, state), def.step);
        return Boolean(value && bounds && isNarrowed(value, bounds));
      }
    }
  }).length;
}
