import { describe, expect, it } from 'vitest';
import { labelForToken, labelForValue, resolveOptions } from '@/lib/filters/options';
import type { MultiDef, TypeDef } from '@/lib/filters/types';
import { DLC, ITEMS, KIND, PROPS, RARITY, WEAPON_TYPE, weapon } from './fixtures';

describe('labelForValue', () => {
  it('prefers the server label', () => {
    expect(
      labelForValue('weaponType', 'hunting-bow', { weaponType: { 'hunting-bow': "Hunter's Bow" } }),
    ).toBe("Hunter's Bow");
  });

  it('humanizes slugs, entity ids and non-strings', () => {
    expect(labelForValue('tags', 'dual-wield')).toBe('Dual Wield');
    expect(labelForValue('locations', 'd1:locations:creeper-woods')).toBe('Creeper Woods');
    expect(labelForValue('ammo', 15)).toBe('15');
    expect(labelForValue('isUnique', true)).toBe('True');
  });

  it('keeps wiki text as written, with a capital first letter', () => {
    expect(labelForValue('effects.label', 'Movement Speed')).toBe('Movement Speed');
    expect(labelForValue('effects.label', 'chance to negate hits')).toBe('Chance to negate hits');
    expect(labelForValue('region', 'Mainland')).toBe('Mainland');
    expect(labelForValue('armorSet', '  Beekeeper Armor ')).toBe('Beekeeper Armor');
  });

  it('falls back when the label map has other fields only', () => {
    expect(labelForValue('tags', 'dual-wield', { other: { 'dual-wield': 'x' } })).toBe(
      'Dual Wield',
    );
  });
});

describe('labelForToken', () => {
  it('uses explicit option labels, the none option, the label map, then humanize', () => {
    expect(labelForToken(KIND, 'melee')).toBe('Melee');
    expect(labelForToken(KIND, 'unlisted')).toBe('Unlisted');
    expect(labelForToken(DLC, 'base-game')).toBe('Base game');
    expect(labelForToken(DLC, 'echoing-void', { dlc: { 'echoing-void': 'Echoing Void!' } })).toBe(
      'Echoing Void!',
    );
    expect(labelForToken(PROPS, 'dual-wield')).toBe('Dual Wield');
    expect(labelForToken({ ...PROPS, noneOption: { value: 'x', label: 'X' } }, 'y')).toBe('Y');
  });
});

describe('resolveOptions', () => {
  it('returns explicit options as written, and appends the none option', () => {
    expect(resolveOptions(KIND, ITEMS).map((o) => o.value)).toEqual(['melee', 'ranged']);
    const explicit: MultiDef = {
      ...DLC,
      options: [{ value: 'a', label: 'A' }],
    };
    expect(resolveOptions(explicit, ITEMS).map((o) => o.value)).toEqual(['a', 'base-game']);
    expect(
      resolveOptions({ ...explicit, noneOption: undefined }, ITEMS).map((o) => o.value),
    ).toEqual(['a']);
  });

  it('derives type options by frequency, then label', () => {
    const options = resolveOptions(WEAPON_TYPE, [
      weapon('a', { weaponType: 'sword' }),
      weapon('b', { weaponType: 'bow' }),
      weapon('c', { weaponType: 'sword' }),
      weapon('d', { weaponType: 'axe' }),
    ]);
    expect(options.map((o) => o.value)).toEqual(['sword', 'axe', 'bow']);
    expect(options[0]?.label).toBe('Sword');
  });

  it('derives multi options A to Z, honouring a custom order first', () => {
    expect(resolveOptions(PROPS, ITEMS).map((o) => o.value)).toEqual([
      'charged-shots',
      'dual-wield',
      'fast-thrusts',
    ]);
    expect(resolveOptions(RARITY, ITEMS).map((o) => o.value)).toEqual(['common', 'rare', 'unique']);
    const ordered: MultiDef = { ...PROPS, order: ['fast-thrusts'] };
    expect(resolveOptions(ordered, ITEMS).map((o) => o.value)).toEqual([
      'fast-thrusts',
      'charged-shots',
      'dual-wield',
    ]);
  });

  it('puts unlisted tokens after the ordered ones, and counts an item once per token', () => {
    const def: TypeDef = { ...KIND, options: 'auto', order: ['ranged'] };
    const items = [weapon('a', { kind: ['melee', 'melee'] }), weapon('b', { kind: 'ranged' })];
    expect(resolveOptions(def, items).map((o) => o.value)).toEqual(['ranged', 'melee']);
  });

  it('appends the none option to automatic options', () => {
    expect(resolveOptions(DLC, ITEMS)).toEqual([
      { value: 'echoing-void', label: 'Echoing Void' },
      { value: 'base-game', label: 'Base game' },
    ]);
  });

  it('uses the label map', () => {
    const [first] = resolveOptions(DLC, ITEMS, { dlc: { 'echoing-void': 'Echoing Void' } });
    expect(first?.label).toBe('Echoing Void');
  });

  it('is empty for an empty list', () => {
    expect(resolveOptions(PROPS, [])).toEqual([]);
  });
});
