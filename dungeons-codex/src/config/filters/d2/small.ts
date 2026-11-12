import {
  locationFilter,
  multiDef,
  opts,
  rangeDef,
  sortOption,
  toggleDef,
  typeDef,
  type CategoryFilters,
} from '../shared';

const keywords = () =>
  multiDef({
    key: 'keywords',
    param: 'p',
    label: 'Effect keyword',
    field: 'tags',
    match: 'all',
    searchable: true,
  });

/** D2 · Enchantments mirror D1 where the data allows (no tiers, costs or gilded text in D2). */
export const D2_ENCHANTMENTS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'appliesTo',
      param: 't',
      label: 'Applies to',
      field: 'appliesTo',
      options: opts(['melee', 'Melee'], ['ranged', 'Ranged'], ['armor', 'Armor']),
    }),
    keywords(),
  ],
  sorts: [],
};

/** D2 · Artifacts: one table on the wiki, no artifact types. */
export const D2_ARTIFACTS: CategoryFilters = {
  defs: [
    rangeDef({
      key: 'cooldown',
      param: 'cd',
      label: 'Cooldown',
      field: 'cooldownSeconds',
      unit: ' s',
      step: 1,
    }),
    rangeDef({ key: 'soulCost', param: 'sc', label: 'Soul cost', field: 'soulCost', step: 5 }),
    keywords(),
    locationFilter(),
  ],
  sorts: [
    sortOption('cd-asc', 'Cooldown (short to long)', 'cooldownSeconds', 'asc'),
    sortOption('cd-desc', 'Cooldown (long to short)', 'cooldownSeconds', 'desc'),
    sortOption('soul-asc', 'Soul cost (low to high)', 'soulCost', 'asc'),
    sortOption('soul-desc', 'Soul cost (high to low)', 'soulCost', 'desc'),
  ],
};

/** D2 · Talismans. */
export const D2_TALISMANS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'boostType',
      param: 't',
      label: 'Boost type',
      field: 'boostType',
      options: opts(
        ['ranged', 'Ranged'],
        ['movement', 'Movement'],
        ['drops', 'Drops'],
        ['artifact', 'Artifact'],
        ['melee', 'Melee'],
        ['health', 'Health'],
        ['pet', 'Pet'],
        ['damage', 'Damage'],
        ['souls', 'Souls'],
        ['experience', 'Experience'],
      ),
    }),
    toggleDef({ key: 'secret', param: 'sec', label: 'Secret', field: 'isSecret' }),
    multiDef({ key: 'source', param: 'src', label: 'Source', field: 'sourceType' }),
    rangeDef({
      key: 'tierIII',
      param: 't3',
      label: 'Tier III value',
      field: 'tierIIIValue',
      step: 1,
    }),
    locationFilter(),
  ],
  sorts: [],
};

/** D2 · Quests. */
export const D2_QUESTS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'questType',
      param: 't',
      label: 'Quest type',
      field: 'questType',
      options: opts(['core', 'Core'], ['side', 'Side']),
    }),
    multiDef({
      key: 'location',
      param: 'loc',
      label: 'Location',
      field: 'locationIds',
      searchable: true,
    }),
    rangeDef({ key: 'xp', param: 'xp', label: 'XP reward', field: 'maxXp', step: 100 }),
    multiDef({
      key: 'rewardItem',
      param: 'ri',
      label: 'Rewards include',
      field: 'rewardItems',
      searchable: true,
    }),
    toggleDef({
      key: 'dlcExclusive',
      param: 'dx',
      label: 'DLC exclusive',
      field: 'dlcExclusive',
    }),
  ],
  sorts: [
    sortOption('story-asc', 'Story order', 'order', 'asc'),
    sortOption('xp-desc', 'XP reward (high to low)', 'maxXp', 'desc'),
  ],
};

/** D2 · Mobs. */
export const D2_MOBS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'mobType',
      param: 't',
      label: 'Mob type',
      field: 'mobType',
      order: ['common', 'mini-boss', 'boss', 'companion', 'pet', 'character', 'merchant'],
    }),
    multiDef({
      key: 'location',
      param: 'loc',
      label: 'Location',
      field: 'locationIds',
      searchable: true,
    }),
    toggleDef({ key: 'hasDrops', param: 'hd', label: 'Has drops', field: 'hasDrops' }),
  ],
  sorts: [],
};

/** D2 · Locations. */
export const D2_LOCATIONS: CategoryFilters = {
  defs: [
    typeDef({
      key: 'locationType',
      param: 't',
      label: 'Location type',
      field: 'locationType',
      options: opts(['overworld', 'Overworld'], ['sift', 'The Sift'], ['rift', 'The Rift']),
    }),
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
