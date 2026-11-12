import {
  dlcFilter,
  multiDef,
  opts,
  sortOption,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

/** D1 · DLCs: a short list shown as release-order cards, with no filters at all. */
export const D1_DLCS: CategoryFilters = {
  defs: [],
  sorts: [sortOption('order-asc', 'Release order', 'order', 'asc')],
};

/** D1 · Cosmetics. */
export const D1_COSMETICS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'cosmeticType',
      param: 't',
      label: 'Cosmetic type',
      field: 'cosmeticType',
      options: opts(
        ['cape', 'Cape'],
        ['pet', 'Pet'],
        ['emote', 'Emote'],
        ['flare', 'Flare'],
        ['skin', 'Skin'],
      ),
    }),
    multiDef({ key: 'obtainedFrom', param: 'of', label: 'Obtained from', field: 'obtainedFrom' }),
    dlcFilter(),
    multiDef({ key: 'season', param: 'se', label: 'Season', field: 'season' }),
  ],
  sorts: [],
};

/** D1 · Mobs. */
export const D1_MOBS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'mobType',
      param: 't',
      label: 'Mob type',
      field: 'mobType',
      order: ['common', 'powerful', 'ancient', 'boss', 'enchanted-endersent', 'summon', 'pet'],
    }),
    multiDef({
      key: 'location',
      param: 'loc',
      label: 'Location',
      field: 'locationIds',
      searchable: true,
    }),
    dlcFilter(),
    toggleDef({ key: 'hasDrops', param: 'hd', label: 'Has drops', field: 'hasDrops' }),
  ],
  sorts: [],
};

/** D1 · Locations. */
export const D1_LOCATIONS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'locationType',
      param: 't',
      label: 'Location type',
      field: 'locationType',
      options: opts(
        ['mission', 'Mission'],
        ['secret', 'Secret'],
        ['dlc-mission', 'DLC mission'],
        ['tower', 'Tower'],
        ['camp', 'Camp'],
        ['other', 'Other'],
      ),
    }),
    multiDef({ key: 'region', param: 'rg', label: 'Region', field: 'region' }),
    dlcFilter(),
    multiDef({
      key: 'mob',
      param: 'mob',
      label: 'Contains mob',
      field: 'mobIds',
      searchable: true,
    }),
  ],
  sorts: [],
};
