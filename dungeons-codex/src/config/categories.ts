/**
 * Per-category display config. Prompt 03 defines only `listFields` (what
 * `getListItems` projects, `[ Plans ]/03-CONTENT-MODEL.md` §6); Prompt 07 adds labels, card
 * fields, table columns and the rest.
 */
import type { CategorySlug, GameId } from './games';
import type { EntityOf } from '@/lib/schemas';

type ListFields = {
  [G in GameId]: { [C in CategorySlug<G>]: readonly (keyof EntityOf<G, C> & string)[] };
};

export const LIST_FIELDS: ListFields = {
  d1: {
    weapons: [
      'kind',
      'weaponType',
      'isUnique',
      'stats',
      'acceptsSoulEnchantments',
      'isSeasonal',
      'comboLength',
    ],
    armor: [
      'armorGroup',
      'isUnique',
      'damageReduction',
      'effects',
      'acceptsSoulEnchantments',
      'isSeasonal',
    ],
    enchantments: ['appliesTo', 'tier', 'isGilded', 'stackable', 'mobObtainable', 'section'],
    artifacts: ['artifactType', 'cooldownSeconds', 'requiresSouls'],
    dlcs: ['order', 'releaseDate', 'summary', 'contentCounts'],
    cosmetics: ['cosmeticType', 'obtainedFrom', 'season'],
    mobs: ['mobType', 'health'],
    locations: ['locationType', 'region', 'recommendedPower'],
  },
  d2: {
    weapons: ['kind', 'weaponType', 'comboLength', 'ammo', 'obtainable', 'effectValues'],
    armor: ['slot', 'armorSet', 'effectValues'],
    enchantments: ['appliesTo', 'tier', 'isGilded', 'stackable', 'mobObtainable', 'section'],
    artifacts: ['artifactType', 'cooldownSeconds', 'requiresSouls'],
    talismans: ['boostType', 'isSecret', 'sourceType', 'passiveBonus'],
    quests: ['questType', 'order', 'dlcExclusive'],
    mobs: ['mobType', 'health'],
    locations: ['locationType', 'region', 'recommendedPower'],
  },
};

/** The field that groups entities of a category ("same group" for related items). */
export const GROUP_FIELD: { [G in GameId]: Partial<Record<CategorySlug<G>, string>> } = {
  d1: {
    weapons: 'weaponType',
    armor: 'armorGroup',
    enchantments: 'tier',
    artifacts: 'artifactType',
    cosmetics: 'cosmeticType',
    mobs: 'mobType',
    locations: 'locationType',
  },
  d2: {
    weapons: 'weaponType',
    armor: 'armorSet',
    enchantments: 'tier',
    artifacts: 'artifactType',
    talismans: 'boostType',
    quests: 'questType',
    mobs: 'mobType',
    locations: 'locationType',
  },
};
