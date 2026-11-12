/**
 * URL codec for filter state: one short param per filter, e.g.
 * `?t=melee&wt=daggers&dmg=10-40&p=dual-wield,spin-attack&u=1&sort=dmg-desc`.
 * Ranges are `min-max`, multis are comma-separated tokens, toggles are `1`. Anything that does
 * not parse is dropped quietly (06-FILTERS-SPEC: invalid params never crash a page).
 */
import { isShown } from './engine';
import type { FilterDef, FilterState, FilterValue } from './types';

const TOKEN = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;
// `min-max`, either side may be negative (cooldown reductions are stored as -40): `-25-25`, `-30--10`.
const RANGE = /^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)$/;
const MAX_TOKEN = 80;
const MAX_TEXT = 100;

const validToken = (s: string): boolean => s.length <= MAX_TOKEN && TOKEN.test(s);

/** Anything `URLSearchParams`-like (Next's `ReadonlyURLSearchParams` too). */
export interface ParamSource {
  get(name: string): string | null;
}

/** The value one raw param holds for `def`, or `undefined` when it is invalid. */
export function decodeValue(def: FilterDef, raw: string): FilterValue | undefined {
  switch (def.kind) {
    case 'type':
      return validToken(raw) ? raw : undefined;
    case 'multi': {
      const tokens = [...new Set(raw.split(',').filter(validToken))];
      return tokens.length > 0 ? tokens : undefined;
    }
    case 'toggle':
      return raw === '1' ? true : undefined;
    case 'range': {
      const match = RANGE.exec(raw);
      const lo = Number(match?.[1]);
      const hi = Number(match?.[2]);
      return match && lo <= hi ? ([lo, hi] as const) : undefined;
    }
    case 'text': {
      const text = raw.trim().slice(0, MAX_TEXT);
      return text === '' ? undefined : text;
    }
  }
}

const clean = (n: number): string => String(Number(n.toFixed(4)));

/** The param text for a value, or `undefined` when the value says "no filter". */
export function encodeValue(def: FilterDef, value: FilterValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  switch (def.kind) {
    case 'toggle':
      return value === true ? '1' : undefined;
    case 'range':
      return Array.isArray(value) && value.length === 2
        ? `${clean(Number(value[0]))}-${clean(Number(value[1]))}`
        : undefined;
    case 'multi':
      return Array.isArray(value) && value.length > 0 ? value.join(',') : undefined;
    case 'type':
    case 'text':
      return typeof value === 'string' && value !== '' ? value : undefined;
  }
}

/** Reads every def's param from the URL; hidden defs (see {@link isShown}) are left out. */
export function parseState(params: ParamSource, defs: readonly FilterDef[]): FilterState {
  const parsed: Record<string, FilterValue> = {};
  for (const def of defs) {
    const raw = params.get(def.param);
    const value = raw === null ? undefined : decodeValue(def, raw);
    if (value !== undefined) parsed[def.param] = value;
  }
  // A filter whose `showWhen` fails (or whose controlling filter is gone) must not linger.
  const state: Record<string, FilterValue> = {};
  for (const def of defs) {
    const value = parsed[def.param];
    if (value !== undefined && isShown(def, parsed)) state[def.param] = value;
  }
  return state;
}

/** The query params for a state, in def order, shown defs only. */
export function serializeState(state: FilterState, defs: readonly FilterDef[]): URLSearchParams {
  const out = new URLSearchParams();
  for (const def of defs) {
    if (!isShown(def, state)) continue;
    const text = encodeValue(def, state[def.param]);
    if (text !== undefined) out.set(def.param, text);
  }
  return out;
}
