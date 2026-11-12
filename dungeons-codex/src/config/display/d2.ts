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
      { label: 'Combo length', field: 'comboLength', format: 'int' },
      { label: 'Ammo', field: 'ammo', format: 'int' },
      { label: 'Primary effect', field: 'primaryEffect', format: 'percent' },
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
      { label: 'Damage reduction', field: 'damageReduction', format: 'percent', better: 'high' },
    ],
    detailSections: ['effects', 'set', 'locations', 'variants'],
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
    compareRows: [],
    detailSections: ['levels', 'obtaining'],
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
      { label: 'Tier III value', field: 'tierIIIValue', format: 'decimal', better: 'high' },
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
    compareRows: [],
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
    compareRows: [],
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
    compareRows: [],
    detailSections: ['quests', 'mobs', 'items'],
    defaultSort: 'name-asc',
  },
};
