import {
  multiDef,
  opts,
  rangeDef,
  sortOption,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

/** `[ Plans ]/06-FILTERS-SPEC.md` · D1 · Enchantments. */
export const D1_ENCHANTMENTS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'appliesTo',
      param: 't',
      label: 'Applies to',
      field: 'appliesTo',
      options: opts(['melee', 'Melee'], ['ranged', 'Ranged'], ['armor', 'Armor']),
    }),
    typeDef({
      key: 'tier',
      param: 'tier',
      label: 'Cost tier',
      field: 'tier',
      level: 2,
      options: opts(['common', 'Common'], ['powerful', 'Powerful']),
    }),
    multiDef({
      key: 'section',
      param: 'sec',
      label: 'Section',
      field: 'section',
      order: ['standard', 'exclusive', 'mob-exclusive'],
    }),
    toggleDef({ key: 'stackable', param: 'st', label: 'Stackable', field: 'stackable' }),
    toggleDef({
      key: 'mobObtainable',
      param: 'mo',
      label: 'Mob-obtainable',
      field: 'mobObtainable',
    }),
    toggleDef({ key: 'gilded', param: 'gd', label: 'Has gilded effect', field: 'hasGilded' }),
    rangeDef({
      key: 'cost',
      param: 'tc',
      label: 'Total point cost',
      field: 'totalCost',
      unit: ' pts',
      step: 1,
    }),
  ],
  sorts: [
    sortOption('cost-desc', 'Total cost (high to low)', 'totalCost', 'desc'),
    sortOption('cost-asc', 'Total cost (low to high)', 'totalCost', 'asc'),
  ],
};
