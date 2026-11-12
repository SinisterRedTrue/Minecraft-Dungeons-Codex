import {
  dlcFilter,
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

/** `[ Plans ]/06-FILTERS-SPEC.md` · D1 · Armor. */
export const D1_ARMOR: CategoryFilters = {
  defs: [
    typeDef({
      key: 'variant',
      param: 't',
      label: 'Type',
      field: 'isUnique',
      options: opts(['false', 'Base'], ['true', 'Unique']),
    }),
    // Every armor group is reachable without picking Base/Unique first, so no `showWhen`.
    typeDef({
      key: 'armorGroup',
      param: 'ag',
      label: 'Armor group',
      field: 'armorGroup',
      level: 2,
    }),
    rangeDef({
      key: 'reduction',
      param: 'dr',
      label: 'Damage reduction',
      field: 'damageReduction',
      unit: '%',
      step: 1,
    }),
    multiDef({
      key: 'effect',
      param: 'fx',
      label: 'Effect',
      field: 'effects.label',
      match: 'all',
      searchable: true,
    }),
    rangeDef({
      key: 'effectStrength',
      param: 'fxv',
      label: 'Effect strength',
      field: 'effects[label={value}].value',
      step: 1,
      dependsOn: 'fx',
    }),
    multiDef({
      key: 'builtIn',
      param: 'be',
      label: 'Built-in enchantment',
      field: 'builtInEnchantments.enchantmentId',
      searchable: true,
    }),
    toggleDef({
      key: 'soul',
      param: 'se',
      label: 'Accepts soul enchantments',
      field: 'acceptsSoulEnchantments',
    }),
    dlcFilter(),
    toggleDef({ key: 'seasonal', param: 'ss', label: 'Seasonal', field: 'isSeasonal' }),
    locationFilter(),
    rarityFilter(),
  ],
  sorts: [
    sortOption('dr-desc', 'Damage reduction (high to low)', 'damageReduction', 'desc'),
    sortOption('dr-asc', 'Damage reduction (low to high)', 'damageReduction', 'asc'),
    rarityDescSort(),
  ],
};
