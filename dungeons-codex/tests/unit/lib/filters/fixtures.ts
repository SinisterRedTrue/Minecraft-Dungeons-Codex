/** A tiny weapon-like catalogue and its filter defs, shared by the filter tests. */
import type {
  FilterDef,
  Item,
  MultiDef,
  RangeDef,
  SortDef,
  TextDef,
  ToggleDef,
  TypeDef,
} from '@/lib/filters/types';

export function weapon(name: string, extra: Record<string, unknown> = {}): Item {
  return { id: `d1:weapons:${name.toLowerCase()}`, name, tags: [], ...extra };
}

export const ITEMS: Item[] = [
  weapon('Sword', {
    kind: 'melee',
    weaponType: 'sword',
    rarity: 'common',
    isUnique: false,
    stats: { damage: 5, speed: 2 },
    tags: ['dual-wield'],
    dlc: undefined,
    comboLength: 3,
    effects: [{ label: 'Movement Speed', value: 30 }],
    locations: ['d1:locations:creeper-woods', 'd1:locations:pumpkin-pastures'],
    obtainable: true,
  }),
  weapon('Daggers', {
    kind: 'melee',
    weaponType: 'daggers',
    rarity: 'unique',
    isUnique: true,
    stats: { damage: 7.5, speed: 3.25 },
    tags: ['dual-wield', 'fast-thrusts'],
    dlc: 'echoing-void',
    comboLength: 4,
    effects: [
      { label: 'Movement Speed', value: 10 },
      { label: 'Life Steal', value: 5 },
    ],
    locations: ['d1:locations:creeper-woods'],
    obtainable: true,
  }),
  weapon('Bow', {
    kind: 'ranged',
    weaponType: 'bow',
    rarity: 'common',
    isUnique: false,
    stats: { damage: 3, speed: 1.5 },
    tags: ['charged-shots'],
    locations: [],
    obtainable: true,
  }),
  weapon('Crossbow', {
    kind: 'ranged',
    weaponType: 'crossbow',
    rarity: 'unique',
    isUnique: true,
    tags: ['charged-shots', 'dual-wield'],
    dlc: 'echoing-void',
    obtainable: false,
  }),
  weapon('Hammer', {
    kind: 'melee',
    weaponType: 'hammer',
    rarity: 'rare',
    isUnique: false,
    stats: { damage: 9 },
    tags: [],
    comboLength: 1,
    health: 'Regular: 8',
    obtainable: true,
  }),
];

export const KIND: TypeDef = {
  kind: 'type',
  key: 'kind',
  param: 't',
  label: 'Type',
  field: 'kind',
  level: 1,
  options: [
    { value: 'melee', label: 'Melee' },
    { value: 'ranged', label: 'Ranged' },
  ],
};
export const WEAPON_TYPE: TypeDef = {
  kind: 'type',
  key: 'weaponType',
  param: 'wt',
  label: 'Weapon type',
  field: 'weaponType',
  level: 2,
  options: 'auto',
  showWhen: { param: 't', equals: ['melee', 'ranged'] },
};
export const DAMAGE: RangeDef = {
  kind: 'range',
  key: 'damage',
  param: 'dmg',
  label: 'Damage',
  field: 'stats.damage',
  step: 0.5,
  unit: '',
};
export const SPEED: RangeDef = {
  kind: 'range',
  key: 'speed',
  param: 'spd',
  label: 'Speed',
  field: 'stats.speed',
  step: 0.05,
};
export const COMBO: RangeDef = {
  kind: 'range',
  key: 'combo',
  param: 'cl',
  label: 'Combo',
  field: 'comboLength',
  step: 1,
  showWhen: { param: 't', equals: 'melee' },
};
export const PROPS: MultiDef = {
  kind: 'multi',
  key: 'props',
  param: 'p',
  label: 'Properties',
  field: 'tags',
  match: 'all',
  options: 'auto',
};
export const RARITY: MultiDef = {
  kind: 'multi',
  key: 'rarity',
  param: 'r',
  label: 'Rarity',
  field: 'rarity',
  match: 'any',
  options: 'auto',
  order: ['common', 'rare', 'unique'],
};
export const DLC: MultiDef = {
  kind: 'multi',
  key: 'dlc',
  param: 'dlc',
  label: 'DLC',
  field: 'dlc',
  match: 'any',
  options: 'auto',
  noneOption: { value: 'base-game', label: 'Base game' },
};
export const UNIQUE: ToggleDef = {
  kind: 'toggle',
  key: 'unique',
  param: 'u',
  label: 'Unique only',
  field: 'isUnique',
  value: true,
};
export const UNOBTAINABLE: ToggleDef = {
  kind: 'toggle',
  key: 'unobtainable',
  param: 'uo',
  label: 'Show unobtainable',
  field: 'obtainable',
  value: false,
  hiddenUntilOn: true,
};
export const EFFECT: MultiDef = {
  kind: 'multi',
  key: 'effect',
  param: 'fx',
  label: 'Effect',
  field: 'effects.label',
  match: 'all',
  options: 'auto',
};
export const EFFECT_STRENGTH: RangeDef = {
  kind: 'range',
  key: 'effectStrength',
  param: 'fxv',
  label: 'Effect strength',
  field: 'effects[label={value}].value',
  step: 1,
  dependsOn: 'fx',
};
export const TEXT: TextDef = {
  kind: 'text',
  key: 'q',
  param: 'q',
  label: 'Search in results',
  fields: ['name', 'tags'],
};

export const DEFS: FilterDef[] = [
  KIND,
  WEAPON_TYPE,
  DAMAGE,
  SPEED,
  COMBO,
  PROPS,
  RARITY,
  DLC,
  UNIQUE,
  UNOBTAINABLE,
  EFFECT,
  EFFECT_STRENGTH,
  TEXT,
];

export const SORT: SortDef = {
  param: 'sort',
  default: 'name-asc',
  options: [
    { value: 'name-asc', label: 'Name', field: 'name', dir: 'asc' },
    { value: 'name-desc', label: 'Name', field: 'name', dir: 'desc' },
    { value: 'dmg-desc', label: 'Damage', field: 'stats.damage', dir: 'desc' },
    { value: 'dmg-asc', label: 'Damage', field: 'stats.damage', dir: 'asc' },
    {
      value: 'rarity-desc',
      label: 'Rarity',
      field: 'rarity',
      dir: 'desc',
      rank: ['common', 'rare', 'unique'],
    },
    { value: 'health-asc', label: 'Health', field: 'health', dir: 'asc' },
  ],
};
