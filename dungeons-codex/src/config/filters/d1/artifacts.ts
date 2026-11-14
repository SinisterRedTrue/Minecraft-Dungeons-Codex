import {
  dlcFilter,
  locationFilter,
  opts,
  rangeDef,
  rarityDescSort,
  sortOption,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

/** `[ Plans ]/06-FILTERS-SPEC.md` · D1 · Artifacts. */
export const D1_ARTIFACTS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'artifactType',
      param: 't',
      label: 'Artifact type',
      field: 'artifactType',
      options: opts(
        ['damaging', 'Damaging'],
        ['status', 'Status'],
        ['quiver', 'Quiver'],
        ['summoning', 'Summoning'],
        ['agility', 'Agility'],
        ['defensive', 'Defensive'],
      ),
    }),
    rangeDef({
      key: 'cooldown',
      param: 'cd',
      label: 'Cooldown',
      field: 'cooldownSeconds',
      unit: ' s',
      step: 0.5,
    }),
    toggleDef({ key: 'souls', param: 'rs', label: 'Requires souls', field: 'requiresSouls' }),
    dlcFilter(),
    locationFilter(),
  ],
  sorts: [
    rarityDescSort([{ field: 'cooldownSeconds', dir: 'asc' }]),
    sortOption('cd-asc', 'Cooldown (short to long)', 'cooldownSeconds', 'asc'),
    sortOption('cd-desc', 'Cooldown (long to short)', 'cooldownSeconds', 'desc'),
  ],
};
