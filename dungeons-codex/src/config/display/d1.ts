import type { CategorySlug } from '../games';
import type { DisplayConfig } from './types';

/** Display config for the eight Dungeons categories (`[ Plans ]/06-FILTERS-SPEC.md` for the sorts). */
export const D1_DISPLAY: Record<CategorySlug<'d1'>, DisplayConfig> = {
  weapons: {
    cardStats: [
      { label: 'DMG', field: 'stats.damage', format: 'decimal' },
      { label: 'SPD', field: 'stats.speed', format: 'decimal' },
    ],
    cardMeta: ['weaponType', 'dlc'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'weaponType', format: 'label', showFrom: 'sm' },
      { key: 'damage', label: 'Damage', field: 'stats.damage', format: 'decimal', sort: 'dmg' },
      { key: 'speed', label: 'Speed', field: 'stats.speed', format: 'decimal', sort: 'spd' },
      { key: 'combo', label: 'Combo', field: 'comboLength', format: 'int', showFrom: 'lg' },
      {
        key: 'rarity',
        label: 'Rarity',
        field: 'rarity',
        format: 'rarity',
        sort: 'rarity',
        showFrom: 'md',
      },
      { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Type', field: 'weaponType', format: 'label' },
      { label: 'Damage', field: 'stats.damage', format: 'decimal', better: 'high' },
      { label: 'Attack speed', field: 'stats.speed', format: 'decimal', better: 'high' },
      { label: 'Area', field: 'stats.area', format: 'decimal', better: 'high' },
      { label: 'Combo length', field: 'comboLength', format: 'int' },
      { label: 'Properties', field: 'properties', format: 'list' },
      {
        label: 'Built-in enchantments',
        field: 'builtInEnchantments.enchantmentId',
        format: 'list',
      },
    ],
    detailSections: ['stats', 'properties', 'forge', 'enchantments', 'locations', 'variants'],
    defaultSort: 'rarity-desc',
  },
  armor: {
    cardStats: [{ label: 'RED', field: 'damageReduction', format: 'percent' }],
    cardMeta: ['armorGroup', 'dlc'],
    tableColumns: [
      { key: 'group', label: 'Group', field: 'armorGroup', format: 'label', showFrom: 'sm' },
      {
        key: 'reduction',
        label: 'Reduction',
        field: 'damageReduction',
        format: 'percent',
        sort: 'dr',
      },
      {
        key: 'rarity',
        label: 'Rarity',
        field: 'rarity',
        format: 'rarity',
        sort: 'rarity',
        showFrom: 'md',
      },
      { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Group', field: 'armorGroup', format: 'label' },
      { label: 'Damage reduction', field: 'damageReduction', format: 'percent', better: 'high' },
      { label: 'Properties', field: 'properties', format: 'list' },
      {
        label: 'Built-in enchantments',
        field: 'builtInEnchantments.enchantmentId',
        format: 'list',
      },
    ],
    detailSections: ['stats', 'properties', 'forge', 'enchantments', 'locations', 'variants'],
    defaultSort: 'rarity-desc',
  },
  enchantments: {
    cardStats: [{ label: 'COST', field: 'totalCost', format: 'int' }],
    cardMeta: ['tier', 'appliesTo'],
    tableColumns: [
      { key: 'applies', label: 'Applies to', field: 'appliesTo', format: 'label', showFrom: 'sm' },
      { key: 'tier', label: 'Tier', field: 'tier', format: 'label' },
      { key: 'cost', label: 'Total cost', field: 'totalCost', format: 'int', sort: 'cost' },
      { key: 'stack', label: 'Stackable', field: 'stackable', format: 'bool', showFrom: 'md' },
    ],
    compareRows: [
      { label: 'Applies to', field: 'appliesTo', format: 'label' },
      { label: 'Tier', field: 'tier', format: 'label' },
      { label: 'Total point cost', field: 'totalCost', format: 'int', better: 'low' },
      { label: 'Stackable', field: 'stackable', format: 'bool' },
      { label: 'Effect by level', field: 'levels', format: 'list' },
    ],
    detailSections: ['tiers', 'levels', 'builtInto'],
    defaultSort: 'name-asc',
  },
  artifacts: {
    cardStats: [{ label: 'CD', field: 'cooldownSeconds', format: 'seconds' }],
    cardMeta: ['artifactType', 'dlc'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'artifactType', format: 'label', showFrom: 'sm' },
      {
        key: 'cooldown',
        label: 'Cooldown',
        field: 'cooldownSeconds',
        format: 'seconds',
        sort: 'cd',
      },
      { key: 'souls', label: 'Souls', field: 'requiresSouls', format: 'bool', showFrom: 'md' },
      { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Type', field: 'artifactType', format: 'label' },
      { label: 'Cooldown', field: 'cooldownSeconds', format: 'seconds', better: 'low' },
      { label: 'Needs souls', field: 'requiresSouls', format: 'bool' },
      { label: 'Properties', field: 'properties', format: 'list' },
    ],
    detailSections: ['stats', 'properties', 'locations'],
    defaultSort: 'rarity-desc',
  },
  dlcs: {
    cardStats: [{ label: 'RELEASED', field: 'releaseDate', format: 'date' }],
    cardMeta: [],
    tableColumns: [
      { key: 'released', label: 'Released', field: 'releaseDate', format: 'date', sort: 'order' },
    ],
    compareRows: [],
    detailSections: ['contents', 'locations'],
    defaultSort: 'order-asc',
    hideFilters: true,
  },
  cosmetics: {
    cardStats: [],
    cardMeta: ['cosmeticType', 'obtainedFrom'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'cosmeticType', format: 'label' },
      {
        key: 'from',
        label: 'Obtained from',
        field: 'obtainedFrom',
        format: 'label',
        showFrom: 'sm',
      },
      { key: 'season', label: 'Season', field: 'season', format: 'text', showFrom: 'md' },
    ],
    compareRows: [
      { label: 'Type', field: 'cosmeticType', format: 'label' },
      { label: 'Obtained from', field: 'obtainedFrom', format: 'label' },
      { label: 'Season', field: 'season', format: 'text' },
    ],
    detailSections: ['obtaining'],
    defaultSort: 'name-asc',
  },
  mobs: {
    cardStats: [{ label: 'HP', field: 'health', format: 'text' }],
    cardMeta: ['mobType', 'dlc'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'mobType', format: 'label' },
      { key: 'health', label: 'Health', field: 'health', format: 'text', showFrom: 'sm' },
      { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'md' },
    ],
    compareRows: [
      { label: 'Type', field: 'mobType', format: 'label' },
      { label: 'Health', field: 'health', format: 'text' },
      { label: 'Attacks', field: 'attacks', format: 'list' },
      { label: 'Drops', field: 'drops', format: 'list' },
    ],
    detailSections: ['stats', 'attacks', 'drops', 'locations'],
    defaultSort: 'name-asc',
  },
  locations: {
    // `recommendedPower` is empty for every synced location, so it is not shown (no invented data).
    cardStats: [],
    cardMeta: ['locationType', 'region'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'locationType', format: 'label' },
      { key: 'region', label: 'Region', field: 'region', format: 'text', showFrom: 'sm' },
      { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Type', field: 'locationType', format: 'label' },
      { label: 'Region', field: 'region', format: 'text' },
      { label: 'Mobs', field: 'mobIds', format: 'count' },
      { label: 'Items found', field: 'itemIds', format: 'count' },
    ],
    detailSections: ['mobs', 'items'],
    defaultSort: 'name-asc',
  },
};
