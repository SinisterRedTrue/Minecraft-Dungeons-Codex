/**
 * Small constructors and the filters several categories share. A category config is just a list
 * of defs plus its extra sort options (`name-asc` / `name-desc` are added for every category).
 */
import type {
  FilterDef,
  MultiDef,
  Option,
  RangeDef,
  SortOption,
  ToggleDef,
  TypeDef,
} from '@/lib/filters/types';

export interface CategoryFilters {
  defs: readonly Exclude<FilterDef, { kind: 'text' }>[];
  /** Extra sorts, default first if it is not a name sort. */
  sorts: readonly SortOption[];
}

export const typeDef = (
  d: Omit<TypeDef, 'kind' | 'options' | 'level'> & { options?: TypeDef['options']; level?: 1 | 2 },
): TypeDef => ({ kind: 'type', options: 'auto', level: 1, ...d });

export const rangeDef = (d: Omit<RangeDef, 'kind'>): RangeDef => ({ kind: 'range', ...d });

export const multiDef = (
  d: Omit<MultiDef, 'kind' | 'options' | 'match'> & {
    options?: MultiDef['options'];
    match?: MultiDef['match'];
  },
): MultiDef => ({ kind: 'multi', options: 'auto', match: 'any', ...d });

export const toggleDef = (
  d: Omit<ToggleDef, 'kind' | 'value'> & { value?: unknown },
): ToggleDef => ({
  kind: 'toggle',
  value: true,
  ...d,
});

/** Options for a type chip row whose order is fixed by the spec. */
export const opts = (...pairs: [value: string, label: string][]): Option[] =>
  pairs.map(([value, label]) => ({ value, label }));

export const RARITY_ORDER = ['common', 'rare', 'special', 'unique'] as const;

export const sortOption = (
  value: string,
  label: string,
  field: string,
  dir: 'asc' | 'desc',
  rank?: readonly string[],
): SortOption => ({ value, label, field, dir, ...(rank ? { rank } : {}) });

export const rarityFilter = (): MultiDef =>
  multiDef({ key: 'rarity', param: 'r', label: 'Rarity', field: 'rarity', order: RARITY_ORDER });

export const rarityDescSort = (): SortOption =>
  sortOption('rarity-desc', 'Rarity', 'rarity', 'desc', RARITY_ORDER);

export const dlcFilter = (): MultiDef =>
  multiDef({
    key: 'dlc',
    param: 'dlc',
    label: 'DLC',
    field: 'dlc',
    noneOption: { value: 'base-game', label: 'Base game' },
  });

export const locationFilter = (field = 'locations', param = 'loc'): MultiDef =>
  multiDef({ key: 'location', param, label: 'Location', field, searchable: true });
