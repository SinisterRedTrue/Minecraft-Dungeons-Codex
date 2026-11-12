/**
 * Filter model (`[ Plans ]/06-FILTERS-SPEC.md`). Definitions are plain data, so a Server Component
 * can pass them to the client browser; the engine in `engine.ts` interprets them.
 *
 * Values are compared as *tokens* (`tokens.ts`): `d1:locations:creeper-woods` and
 * "Creeper Woods" both become `creeper-woods`. State and URLs therefore only ever hold readable,
 * URL-safe slugs, whatever the raw field looks like.
 */

export interface Option {
  /** Token (URL-safe slug). */
  value: string;
  label: string;
}

/** Show a filter only while the param `param` holds one of `equals`. */
export interface Cond {
  param: string;
  equals: string | string[];
}

interface DefBase {
  /** Unique within a category; also the key of its facet counts. */
  key: string;
  /** Short, stable URL parameter. Never `q`, `sort`, `view` or `grp`, which the browser owns. */
  param: string;
  label: string;
  showWhen?: Cond;
}

export interface TypeDef extends DefBase {
  kind: 'type';
  /** Dot-path into the list item (see `path.ts`). */
  field: string;
  /** `'auto'` derives the options from the data. */
  options: 'auto' | Option[];
  /** Level 1 is the primary dimension; level 2 narrows it and resets when level 1 changes. */
  level: 1 | 2;
  /** Token order for `'auto'` options; tokens it does not list follow by count. */
  order?: readonly string[];
}

export interface RangeDef extends DefBase {
  kind: 'range';
  field: string;
  unit?: string;
  step: number;
  /**
   * The field holds `{value}`, which is replaced by the single value selected for param
   * `dependsOn`. The range is inactive unless exactly one value is selected there.
   */
  dependsOn?: string;
}

export interface MultiDef extends DefBase {
  kind: 'multi';
  field: string;
  match: 'any' | 'all';
  options: 'auto' | Option[];
  searchable?: boolean;
  order?: readonly string[];
  /** An extra option that matches items with no value at all (for example "Base game"). */
  noneOption?: Option;
}

export interface ToggleDef extends DefBase {
  kind: 'toggle';
  field: string;
  value: unknown;
  /**
   * Invert the meaning: items whose field equals `value` are hidden until the toggle is on
   * (for example "Show unobtainable").
   */
  hiddenUntilOn?: boolean;
}

export interface TextDef {
  kind: 'text';
  key: 'q';
  param: 'q';
  label: 'Search in results';
  fields: string[];
  showWhen?: undefined;
}

export type FilterDef = TypeDef | RangeDef | MultiDef | ToggleDef | TextDef;
export type OptionDef = TypeDef | MultiDef;

export interface SortOption {
  value: string;
  label: string;
  field: string;
  dir: 'asc' | 'desc';
  /** Order of the field's values, lowest first (for example rarity). Others sort by value. */
  rank?: readonly string[];
}

export interface SortDef {
  param: 'sort';
  options: SortOption[];
  default: string;
}

export type RangeValue = readonly [number, number];
export type FilterValue = string | boolean | readonly string[] | RangeValue;
/** Active filters keyed by URL param; a missing key means "not filtered". */
export type FilterState = Readonly<Record<string, FilterValue>>;

/** Anything with fields; `EntityListItem` satisfies it. */
export type Item = Readonly<Record<string, unknown>>;

export interface Bounds {
  min: number;
  max: number;
}

/** Facet counts: filter key → option token → number of results that option would give. */
export type FacetCounts = Record<string, Record<string, number>>;
