/**
 * State helpers shared by the browser UI: sanitising a URL-derived state against the data,
 * the patch a change produces (level-1 types reset level 2), and the removable "active filter"
 * chips. Pure, so it is unit-tested without React.
 */
import {
  boundsFor,
  isNarrowed,
  isShown,
  rangeBounds,
  rangeField,
  stateList,
  stateRange,
  stateString,
  tokensOf,
} from './engine';
import { toToken } from './tokens';
import type { FilterDef, FilterState, FilterValue, Item, OptionDef } from './types';

/** `param → new value`; `null` removes the param. Feeds nuqs' `setValues` directly. */
export type StatePatch = Record<string, FilterValue | null>;

/** Every token that occurs in the data for a type/multi def, plus its "none" option. */
export function tokenUniverse(items: readonly Item[], def: OptionDef): Set<string> {
  const universe = new Set<string>();
  const none = def.kind === 'multi' ? def.noneOption?.value : undefined;
  for (const item of items) {
    const tokens = tokensOf(item, def.field);
    if (tokens.length === 0 && none !== undefined) universe.add(none);
    for (const token of tokens) universe.add(token);
  }
  return universe;
}

/**
 * Whether the data gives a filter anything to do: options for a type/multi, a spread of values for
 * a range, at least one matching item for a toggle. The panel hides filters that fail this (for example
 * "Has drops" on a game whose mobs list no drops) instead of showing a dead control.
 */
export function hasData(items: readonly Item[], def: FilterDef, state: FilterState): boolean {
  switch (def.kind) {
    case 'type':
    case 'multi':
      return tokenUniverse(items, def).size > 0;
    case 'toggle': {
      const wanted = toToken(def.value);
      return items.some((item) => tokensOf(item, def.field).includes(wanted));
    }
    case 'range': {
      // One distinct value (every D2 damage-reduction piece is 25 %) leaves nothing to filter.
      const bounds = rangeBounds(items, def, state);
      return bounds !== null && bounds.min < bounds.max;
    }
    case 'text':
      return true;
  }
}

/**
 * Drops what the data cannot satisfy: unknown option tokens, ranges outside (or equal to) the
 * bounds, and anything whose parent filter is gone. Defs must list level 1 before level 2.
 */
export function sanitizeState(
  items: readonly Item[],
  defs: readonly FilterDef[],
  state: FilterState,
): FilterState {
  const out: Record<string, FilterValue> = {};
  for (const def of defs) {
    if (!isShown(def, out)) continue;
    const value = state[def.param];
    switch (def.kind) {
      case 'type': {
        const token = stateString(value);
        if (token !== undefined && tokenUniverse(items, def).has(token)) out[def.param] = token;
        break;
      }
      case 'multi': {
        const universe = tokenUniverse(items, def);
        const kept = stateList(value).filter((t) => universe.has(t));
        if (kept.length > 0) out[def.param] = kept;
        break;
      }
      case 'toggle':
        if (value === true) out[def.param] = true;
        break;
      case 'range': {
        const range = stateRange(value);
        const bounds = boundsFor(items, rangeField(def, out), def.step);
        if (!range || !bounds) break;
        const clamped = [Math.max(range[0], bounds.min), Math.min(range[1], bounds.max)] as const;
        if (clamped[0] <= clamped[1] && isNarrowed(clamped, bounds)) out[def.param] = clamped;
        break;
      }
      case 'text': {
        const text = stateString(value);
        if (text !== undefined) out[def.param] = text;
        break;
      }
    }
  }
  return out;
}

/** The change for setting `def` to `value`; a new level-1 type clears every level-2 type. */
export function patchFor(
  defs: readonly FilterDef[],
  def: FilterDef,
  value: FilterValue | null,
): StatePatch {
  const patch: StatePatch = { [def.param]: value };
  if (def.kind === 'type' && def.level === 1) {
    for (const other of defs) {
      if (other.kind === 'type' && other.level === 2) patch[other.param] = null;
    }
  }
  return patch;
}

/** Removes every filter (sort and view are not filters). */
export function clearPatch(defs: readonly FilterDef[]): StatePatch {
  return Object.fromEntries(defs.map((def) => [def.param, null]));
}

export interface ActiveChip {
  /** Stable React key. */
  id: string;
  label: string;
  /** What removing this chip changes. */
  patch: StatePatch;
}

const dash = '–';

/**
 * One removable chip per thing the user chose: each multi value, each level-2 type, narrowed
 * ranges, toggles and the text query. (Level-1 types stay visible in the type selector.)
 */
export function describeActive(
  items: readonly Item[],
  defs: readonly FilterDef[],
  state: FilterState,
  labelOf: (def: OptionDef, token: string) => string,
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const def of defs) {
    if (!isShown(def, state)) continue;
    const value = state[def.param];
    switch (def.kind) {
      case 'type': {
        const token = stateString(value);
        if (token !== undefined && def.level === 2) {
          chips.push({
            id: `${def.key}:${token}`,
            label: labelOf(def, token),
            patch: { [def.param]: null },
          });
        }
        break;
      }
      case 'multi': {
        const tokens = stateList(value);
        for (const token of tokens) {
          const rest = tokens.filter((t) => t !== token);
          chips.push({
            id: `${def.key}:${token}`,
            label: labelOf(def, token),
            patch: { [def.param]: rest.length > 0 ? rest : null },
          });
        }
        break;
      }
      case 'toggle':
        if (value === true)
          chips.push({ id: def.key, label: def.label, patch: { [def.param]: null } });
        break;
      case 'range': {
        const range = stateRange(value);
        const bounds = boundsFor(items, rangeField(def, state), def.step);
        if (range && bounds && isNarrowed(range, bounds)) {
          const unit = def.unit ?? '';
          chips.push({
            id: def.key,
            label: `${def.label} ${range[0]}${dash}${range[1]}${unit}`,
            patch: { [def.param]: null },
          });
        }
        break;
      }
      case 'text': {
        const text = stateString(value);
        if (text !== undefined) {
          chips.push({ id: def.key, label: `“${text}”`, patch: { [def.param]: null } });
        }
        break;
      }
    }
  }
  return chips;
}
