import {
  locationFilter,
  multiDef,
  opts,
  rangeDef,
  rarityDescSort,
  rarityFilter,
  sortOption,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

/** `[ Plans ]/06-FILTERS-SPEC.md` · D2 · Armor (the "Group by set" view is in the display config). */
export const D2_ARMOR: CategoryFilters = {
  defs: [
    typeDef({
      key: 'slot',
      param: 't',
      label: 'Slot',
      field: 'slot',
      options: opts(
        ['helmet', 'Helmet'],
        ['chestplate', 'Chestplate'],
        ['leggings', 'Leggings'],
        ['boots', 'Boots'],
      ),
    }),
    // 38 sets: a searchable list instead of a chip row, and reachable without picking a slot.
    typeDef({ key: 'armorSet', param: 'as', label: 'Armor set', field: 'armorSet', level: 2 }),
    rarityFilter(),
    toggleDef({ key: 'unique', param: 'u', label: 'Unique only', field: 'isUnique', quick: true }),
    rangeDef({
      key: 'reduction',
      param: 'dr',
      label: 'Damage reduction',
      field: 'damageReduction',
      unit: '%',
      step: 1,
    }),
    multiDef({
      key: 'keywords',
      param: 'p',
      label: 'Effect keyword',
      field: 'tags',
      match: 'all',
      searchable: true,
    }),
    locationFilter(),
  ],
  sorts: [
    rarityDescSort([{ field: 'damageReduction', dir: 'desc' }]),
    sortOption('dr-desc', 'Damage reduction (high to low)', 'damageReduction', 'desc'),
    sortOption('dr-asc', 'Damage reduction (low to high)', 'damageReduction', 'asc'),
  ],
};
