/**
 * Detail page config (`[ Plans ]/05-ROUTES-AND-PAGES.md` "Detail page"): which facts the infobox
 * lists, which numbers get stat bars and which chips sit under the name, per game and category.
 * Plain data, so tests can check it against the real data. Which *sections* a page shows is
 * `detailSections` in the category's display config.
 */
import type { ChipSpec, InfoRowSpec, PerCategory, StatRowSpec } from './detailTypes';

export type { ChipSpec, InfoRowSpec, StatRowSpec } from './detailTypes';

const rarity: InfoRowSpec = { label: 'Rarity', field: 'rarity', format: 'rarity' };
const dlc: InfoRowSpec = { label: 'DLC', field: 'dlc', format: 'ref', refKind: 'dlcs' };
const base: InfoRowSpec = { label: 'Base item', field: 'baseItemId', format: 'ref' };
const variants: InfoRowSpec = { label: 'Variants', field: 'variantIds', format: 'refs' };

export const INFOBOX_ROWS: PerCategory<readonly InfoRowSpec[]> = {
  d1: {
    weapons: [
      { label: 'Type', field: 'kind', format: 'label' },
      { label: 'Group', field: 'weaponType', format: 'ref', refKind: 'self' },
      rarity,
      dlc,
      { label: 'Combo', field: 'comboLength', format: 'int' },
      { label: 'Ammo', field: 'ammo', format: 'label' },
      { label: 'Damage type', field: 'damageType', format: 'text' },
      { label: 'Soul enchantments', field: 'acceptsSoulEnchantments', format: 'bool' },
      { label: 'Seasonal reward', field: 'isSeasonal', format: 'bool' },
      base,
      variants,
    ],
    armor: [
      { label: 'Group', field: 'armorGroup', format: 'ref', refKind: 'self' },
      rarity,
      dlc,
      { label: 'Damage reduction', field: 'damageReduction', format: 'percent' },
      { label: 'Base health', field: 'baseHealth', format: 'int' },
      { label: 'Soul enchantments', field: 'acceptsSoulEnchantments', format: 'bool' },
      { label: 'Seasonal reward', field: 'isSeasonal', format: 'bool' },
      base,
      variants,
    ],
    enchantments: [
      { label: 'Applies to', field: 'appliesTo', format: 'label' },
      { label: 'Tier', field: 'tier', format: 'label' },
      { label: 'Point cost', field: 'pointCost', format: 'join' },
      { label: 'Stackable', field: 'stackable', format: 'bool' },
      { label: 'Obtainable from mobs', field: 'mobObtainable', format: 'bool' },
      { label: 'Section', field: 'section', format: 'label' },
      dlc,
    ],
    artifacts: [
      { label: 'Type', field: 'artifactType', format: 'label' },
      rarity,
      dlc,
      { label: 'Cooldown', field: 'cooldownSeconds', format: 'seconds' },
      { label: 'Needs souls', field: 'requiresSouls', format: 'bool' },
    ],
    dlcs: [
      { label: 'Released', field: 'releaseDate', format: 'date' },
      { label: 'Release order', field: 'order', format: 'int' },
      { label: 'Missions', field: 'locationIds', format: 'size', noun: ['mission', 'missions'] },
    ],
    cosmetics: [
      { label: 'Type', field: 'cosmeticType', format: 'label' },
      { label: 'Obtained from', field: 'obtainedFrom', format: 'label' },
      { label: 'Season', field: 'season', format: 'text' },
    ],
    mobs: [
      { label: 'Type', field: 'mobType', format: 'label' },
      { label: 'Health', field: 'health', format: 'text' },
      dlc,
      { label: 'Variants', field: 'variants', format: 'refs' },
    ],
    locations: [
      { label: 'Type', field: 'locationType', format: 'label' },
      { label: 'Region', field: 'region', format: 'text' },
      dlc,
      { label: 'Secret level of', field: 'secretOf', format: 'ref' },
      { label: 'Recommended power', field: 'recommendedPower', format: 'text' },
      { label: 'Mobs', field: 'mobIds', format: 'size', noun: ['mob', 'mobs'] },
      { label: 'Items found', field: 'itemIds', format: 'size', noun: ['item', 'items'] },
    ],
  },
  d2: {
    weapons: [
      { label: 'Type', field: 'kind', format: 'label' },
      { label: 'Group', field: 'weaponType', format: 'ref', refKind: 'self' },
      rarity,
      dlc,
      { label: 'Combo', field: 'comboLength', format: 'int' },
      { label: 'Ammo', field: 'ammo', format: 'int' },
      { label: 'Obtainable', field: 'obtainable', format: 'bool' },
      base,
      variants,
    ],
    armor: [
      { label: 'Slot', field: 'slot', format: 'label' },
      { label: 'Set', field: 'armorSet', format: 'text' },
      rarity,
      dlc,
      base,
      variants,
    ],
    enchantments: [
      { label: 'Applies to', field: 'appliesTo', format: 'label' },
      { label: 'Restriction', field: 'restriction', format: 'text' },
      dlc,
    ],
    artifacts: [
      rarity,
      dlc,
      { label: 'Soul cost', field: 'soulCost', format: 'int' },
      { label: 'Cooldown', field: 'cooldownSeconds', format: 'seconds' },
    ],
    talismans: [
      { label: 'Boost', field: 'boostType', format: 'label' },
      { label: 'Source', field: 'sourceType', format: 'label' },
      { label: 'Bonus', field: 'passiveBonus', format: 'text' },
      { label: 'Secret', field: 'isSecret', format: 'bool' },
    ],
    quests: [
      { label: 'Type', field: 'questType', format: 'label' },
      { label: 'Story order', field: 'order', format: 'int' },
      { label: 'DLC exclusive', field: 'dlcExclusive', format: 'bool' },
      { label: 'Areas', field: 'areas', format: 'refs' },
    ],
    mobs: [
      { label: 'Type', field: 'mobType', format: 'label' },
      { label: 'Health', field: 'health', format: 'text' },
      { label: 'Variants', field: 'variants', format: 'refs' },
    ],
    locations: [
      { label: 'Type', field: 'locationType', format: 'label' },
      { label: 'Region', field: 'region', format: 'text' },
      dlc,
      { label: 'Stations', field: 'stations', format: 'refs' },
      { label: 'Sub-areas', field: 'subAreas', format: 'refs' },
      { label: 'Mobs', field: 'mobIds', format: 'size', noun: ['mob', 'mobs'] },
      { label: 'Items found', field: 'itemIds', format: 'size', noun: ['item', 'items'] },
    ],
  },
};

/** Numbers drawn as bars, scaled to the largest value in the category. */
export const STAT_ROWS: PerCategory<readonly StatRowSpec[]> = {
  d1: {
    weapons: [
      { label: 'Damage', field: 'stats.damage' },
      { label: 'Attack speed', field: 'stats.speed' },
      { label: 'Area', field: 'stats.area' },
      { label: 'Ammo', field: 'stats.ammo' },
      { label: 'Combo length', field: 'comboLength' },
    ],
    armor: [{ label: 'Damage reduction', field: 'damageReduction', unit: '%' }],
    enchantments: [],
    artifacts: [{ label: 'Cooldown', field: 'cooldownSeconds', unit: 's' }],
    dlcs: [],
    cosmetics: [],
    mobs: [{ label: 'Health', field: 'health' }],
    locations: [],
  },
  d2: {
    weapons: [
      { label: 'Combo length', field: 'comboLength' },
      { label: 'Ammo', field: 'ammo' },
    ],
    armor: [{ label: 'Damage reduction', field: 'damageReduction', unit: '%' }],
    enchantments: [],
    artifacts: [
      { label: 'Cooldown', field: 'cooldownSeconds', unit: 's' },
      { label: 'Soul cost', field: 'soulCost' },
    ],
    talismans: [],
    quests: [],
    mobs: [{ label: 'Health', field: 'health' }],
    locations: [],
  },
};

/** Type chips next to the rarity badge in the header. */
export const HEADER_CHIPS: PerCategory<readonly ChipSpec[]> = {
  d1: {
    weapons: [{ field: 'kind' }, { field: 'weaponType', refKind: 'self' }],
    armor: [{ field: 'armorGroup', refKind: 'self' }],
    enchantments: [{ field: 'appliesTo' }, { field: 'tier' }],
    artifacts: [{ field: 'artifactType' }],
    dlcs: [],
    cosmetics: [{ field: 'cosmeticType' }, { field: 'obtainedFrom' }],
    mobs: [{ field: 'mobType' }],
    locations: [{ field: 'locationType' }, { field: 'region' }],
  },
  d2: {
    weapons: [{ field: 'kind' }, { field: 'weaponType', refKind: 'self' }],
    armor: [{ field: 'slot' }, { field: 'armorSet' }],
    enchantments: [{ field: 'appliesTo' }],
    artifacts: [],
    talismans: [{ field: 'boostType' }, { field: 'sourceType' }],
    quests: [{ field: 'questType' }],
    mobs: [{ field: 'mobType' }],
    locations: [{ field: 'locationType' }, { field: 'region' }],
  },
};

/** The five categories a D1 DLC's contents grids list (`contentCounts` in 03-CONTENT-MODEL §3.5). */
export const DLC_CONTENT_CATEGORIES = [
  'weapons',
  'armor',
  'artifacts',
  'mobs',
  'enchantments',
] as const;

/** Detail page areas: the right-hand column holds these sections, the main column the rest. */
export const ASIDE_SECTIONS: readonly string[] = ['enchantments', 'locations', 'variants'];

/** Related items shown: 6 on desktop, 4 on mobile (the last two are hidden below `sm`). */
export const RELATED_LIMIT = 6;
export const RELATED_LIMIT_MOBILE = 4;
