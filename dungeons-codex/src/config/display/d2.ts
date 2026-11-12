import type { CategorySlug } from '../games';
import type { DisplayConfig } from './types';

/** Display config for the eight Dungeons II categories. */
export const D2_DISPLAY: Record<CategorySlug<'d2'>, DisplayConfig> = {
  weapons: {
    cardStats: [
      { label: 'COMBO', field: 'comboLength', format: 'int' },
      { label: 'AMMO', field: 'ammo', format: 'int' },
    ],
    cardMeta: ['weaponType', 'rarity'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'weaponType', format: 'label', showFrom: 'sm' },
      { key: 'combo', label: 'Combo', field: 'comboLength', format: 'int', showFrom: 'md' },
      { key: 'ammo', label: 'Ammo', field: 'ammo', format: 'int', showFrom: 'md' },
      { key: 'effect', label: 'Effect %', field: 'primaryEffect', format: 'percent' },
      { key: 'rarity', label: 'Rarity', field: 'rarity', format: 'rarity', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Type', field: 'weaponType', format: 'label' },
      { label: 'Combo length', field: 'comboLength', format: 'int' },
      { label: 'Ammo', field: 'ammo', format: 'int' },
      { label: 'Primary effect', field: 'primaryEffect', format: 'percent' },
      { label: 'Effect', field: 'effect', format: 'list' },
    ],
    detailSections: ['stats', 'effects', 'forge', 'locations', 'variants'],
    defaultSort: 'name-asc',
  },
  armor: {
    cardStats: [{ label: 'RED', field: 'damageReduction', format: 'percent' }],
    cardMeta: ['slot', 'armorSet'],
    tableColumns: [
      { key: 'slot', label: 'Slot', field: 'slot', format: 'label' },
      { key: 'set', label: 'Set', field: 'armorSet', format: 'text', showFrom: 'sm' },
      {
        key: 'reduction',
        label: 'Reduction',
        field: 'damageReduction',
        format: 'percent',
        sort: 'dr',
        showFrom: 'md',
      },
      { key: 'rarity', label: 'Rarity', field: 'rarity', format: 'rarity', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Slot', field: 'slot', format: 'label' },
      { label: 'Set', field: 'armorSet', format: 'text' },
      { label: 'Damage reduction', field: 'damageReduction', format: 'percent', better: 'high' },
      { label: 'Effects', field: 'effects', format: 'list' },
    ],
    detailSections: ['effects', 'forge', 'set', 'locations', 'variants'],
    defaultSort: 'name-asc',
    groupBy: {
      param: 'grp',
      label: 'Group by set',
      field: 'armorSet',
      order: { field: 'slot', rank: ['helmet', 'chestplate', 'leggings', 'boots'] },
    },
  },
  enchantments: {
    cardStats: [],
    cardMeta: ['appliesTo'],
    tableColumns: [
      { key: 'applies', label: 'Applies to', field: 'appliesTo', format: 'label' },
      {
        key: 'restriction',
        label: 'Restriction',
        field: 'restriction',
        format: 'text',
        showFrom: 'sm',
      },
    ],
    compareRows: [
      { label: 'Applies to', field: 'appliesTo', format: 'label' },
      { label: 'Restriction', field: 'restriction', format: 'text' },
      { label: 'Effect by level', field: 'levels', format: 'list' },
    ],
    detailSections: ['tiers', 'levels', 'obtaining'],
    defaultSort: 'name-asc',
  },
  artifacts: {
    cardStats: [
      { label: 'CD', field: 'cooldownSeconds', format: 'seconds' },
      { label: 'SOULS', field: 'soulCost', format: 'int' },
    ],
    cardMeta: [],
    tableColumns: [
      {
        key: 'cooldown',
        label: 'Cooldown',
        field: 'cooldownSeconds',
        format: 'seconds',
        sort: 'cd',
      },
      { key: 'souls', label: 'Soul cost', field: 'soulCost', format: 'int', sort: 'soul' },
    ],
    compareRows: [
      { label: 'Cooldown', field: 'cooldownSeconds', format: 'seconds', better: 'low' },
      { label: 'Soul cost', field: 'soulCost', format: 'int', better: 'low' },
      { label: 'Needs souls', field: 'requiresSouls', format: 'bool' },
    ],
    detailSections: ['stats', 'locations'],
    defaultSort: 'name-asc',
  },
  talismans: {
    cardStats: [{ label: 'T-III', field: 'tierIIIValue', format: 'decimal' }],
    cardMeta: ['boostType', 'sourceType'],
    tableColumns: [
      { key: 'boost', label: 'Boost', field: 'boostType', format: 'label' },
      { key: 'source', label: 'Source', field: 'sourceType', format: 'label', showFrom: 'sm' },
      { key: 'secret', label: 'Secret', field: 'isSecret', format: 'bool', showFrom: 'md' },
      { key: 'bonus', label: 'Bonus', field: 'passiveBonus', format: 'text', showFrom: 'lg' },
    ],
    compareRows: [
      { label: 'Boost type', field: 'boostType', format: 'label' },
      { label: 'Source', field: 'sourceType', format: 'label' },
      { label: 'Secret', field: 'isSecret', format: 'bool' },
      { label: 'Tier III value', field: 'tierIIIValue', format: 'decimal', better: 'high' },
      { label: 'Passive bonus', field: 'passiveBonus', format: 'text' },
      { label: 'Tiers', field: 'tiers', format: 'list' },
    ],
    detailSections: ['tiers', 'locations'],
    defaultSort: 'name-asc',
  },
  quests: {
    cardStats: [{ label: 'XP', field: 'maxXp', format: 'int' }],
    cardMeta: ['questType'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'questType', format: 'label' },
      { key: 'xp', label: 'XP', field: 'maxXp', format: 'int', sort: 'xp' },
      {
        key: 'order',
        label: 'Story order',
        field: 'order',
        format: 'int',
        sort: 'story',
        showFrom: 'sm',
      },
    ],
    compareRows: [
      { label: 'Type', field: 'questType', format: 'label' },
      { label: 'Story order', field: 'order', format: 'int' },
      { label: 'Best XP reward', field: 'maxXp', format: 'int', better: 'high' },
      { label: 'Reward items', field: 'rewardItems', format: 'list' },
    ],
    detailSections: ['rewards', 'story', 'locations'],
    defaultSort: 'story-asc',
  },
  mobs: {
    cardStats: [{ label: 'HP', field: 'health', format: 'text' }],
    cardMeta: ['mobType'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'mobType', format: 'label' },
      { key: 'health', label: 'Health', field: 'health', format: 'text', showFrom: 'sm' },
    ],
    compareRows: [
      { label: 'Type', field: 'mobType', format: 'label' },
      { label: 'Health', field: 'health', format: 'text' },
      { label: 'Attacks', field: 'attacks', format: 'list' },
    ],
    detailSections: ['stats', 'attacks', 'drops', 'locations'],
    defaultSort: 'name-asc',
  },
  locations: {
    cardStats: [],
    cardMeta: ['locationType', 'region'],
    tableColumns: [
      { key: 'type', label: 'Type', field: 'locationType', format: 'label' },
      { key: 'region', label: 'Region', field: 'region', format: 'text', showFrom: 'sm' },
    ],
    compareRows: [
      { label: 'Type', field: 'locationType', format: 'label' },
      { label: 'Region', field: 'region', format: 'text' },
      { label: 'Mobs', field: 'mobIds', format: 'count' },
      { label: 'Items found', field: 'itemIds', format: 'count' },
      { label: 'Quests', field: 'questIds', format: 'count' },
    ],
    detailSections: ['quests', 'mobs', 'items'],
    defaultSort: 'name-asc',
  },
};
