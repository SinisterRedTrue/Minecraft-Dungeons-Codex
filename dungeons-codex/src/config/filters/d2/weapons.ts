import {
  locationFilter,
  multiDef,
  opts,
  rangeDef,
  rarityFilter,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

/** `[ Plans ]/06-FILTERS-SPEC.md` · D2 · Weapons. */
export const D2_WEAPONS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'kind',
      param: 't',
      label: 'Type',
      field: 'kind',
      options: opts(['melee', 'Melee'], ['ranged', 'Ranged']),
    }),
    typeDef({
      key: 'weaponType',
      param: 'wt',
      label: 'Weapon type',
      field: 'weaponType',
      level: 2,
      showWhen: { param: 't', equals: ['melee', 'ranged'] },
    }),
    rarityFilter(),
    multiDef({
      key: 'keywords',
      param: 'p',
      label: 'Effect keyword',
      field: 'tags',
      match: 'all',
      searchable: true,
    }),
    rangeDef({
      key: 'primaryEffect',
      param: 'pe',
      label: 'Primary effect',
      field: 'primaryEffect',
      unit: '%',
      step: 1,
    }),
    rangeDef({
      key: 'combo',
      param: 'cl',
      label: 'Combo length',
      field: 'comboLength',
      step: 1,
      showWhen: { param: 't', equals: 'melee' },
    }),
    multiDef({
      key: 'ammo',
      param: 'am',
      label: 'Ammo',
      field: 'ammo',
      showWhen: { param: 't', equals: 'ranged' },
    }),
    locationFilter(),
    // Unobtainable weapons are listed but hidden until this is switched on.
    toggleDef({
      key: 'unobtainable',
      param: 'uo',
      label: 'Show unobtainable',
      field: 'obtainable',
      value: false,
      hiddenUntilOn: true,
    }),
  ],
  sorts: [],
};
