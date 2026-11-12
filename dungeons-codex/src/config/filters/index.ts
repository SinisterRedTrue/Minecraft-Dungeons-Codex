/**
 * Filter + sort config for the 16 game/category pairs. Every category also gets the `q` text
 * search (name + properties) and Name A–Z / Z–A sorting automatically (06-FILTERS-SPEC).
 */
import { getCategoryConfig } from '../categories';
import type { GameId } from '../games';
import { D1_ARMOR } from './d1/armor';
import { D1_ARTIFACTS } from './d1/artifacts';
import { D1_ENCHANTMENTS } from './d1/enchantments';
import { D1_COSMETICS, D1_DLCS, D1_LOCATIONS, D1_MOBS } from './d1/small';
import { D1_WEAPONS } from './d1/weapons';
import { D2_ARMOR } from './d2/armor';
import {
  D2_ARTIFACTS,
  D2_ENCHANTMENTS,
  D2_LOCATIONS,
  D2_MOBS,
  D2_QUESTS,
  D2_TALISMANS,
} from './d2/small';
import { D2_WEAPONS } from './d2/weapons';
import type { CategoryFilters } from './shared';
import type { FilterDef, SortDef, SortOption, TextDef } from '@/lib/filters/types';

const CONFIGS: Record<string, CategoryFilters> = {
  'd1/weapons': D1_WEAPONS,
  'd1/armor': D1_ARMOR,
  'd1/enchantments': D1_ENCHANTMENTS,
  'd1/artifacts': D1_ARTIFACTS,
  'd1/dlcs': D1_DLCS,
  'd1/cosmetics': D1_COSMETICS,
  'd1/mobs': D1_MOBS,
  'd1/locations': D1_LOCATIONS,
  'd2/weapons': D2_WEAPONS,
  'd2/armor': D2_ARMOR,
  'd2/enchantments': D2_ENCHANTMENTS,
  'd2/artifacts': D2_ARTIFACTS,
  'd2/talismans': D2_TALISMANS,
  'd2/quests': D2_QUESTS,
  'd2/mobs': D2_MOBS,
  'd2/locations': D2_LOCATIONS,
};

/** Params the browser itself owns; no filter may use them. */
export const RESERVED_PARAMS = ['q', 'sort', 'view', 'grp'] as const;

export const TEXT_DEF: TextDef = {
  kind: 'text',
  key: 'q',
  param: 'q',
  label: 'Search in results',
  fields: ['name', 'tags'],
};

export const NAME_SORTS: readonly SortOption[] = [
  { value: 'name-asc', label: 'Name (A to Z)', field: 'name', dir: 'asc' },
  { value: 'name-desc', label: 'Name (Z to A)', field: 'name', dir: 'desc' },
];

export interface ResolvedFilters {
  /** The category's filters, then the `q` search. */
  defs: FilterDef[];
  sort: SortDef;
}

/** Filters and sorting for a category, or `undefined` for an unknown pair. */
export function getFilterConfig(game: GameId, category: string): ResolvedFilters | undefined {
  const config = CONFIGS[`${game}/${category}`];
  const display = getCategoryConfig(game, category);
  if (!config || !display) return undefined;
  const all = [...config.sorts, ...NAME_SORTS];
  const first = all.find((o) => o.value === display.defaultSort);
  const rest = all.filter((o) => o.value !== display.defaultSort);
  return {
    defs: display.hideFilters ? [] : [...config.defs, TEXT_DEF],
    sort: { param: 'sort', options: first ? [first, ...rest] : rest, default: display.defaultSort },
  };
}
