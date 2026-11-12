// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  normalizeName,
  parseCooldown,
  parseEffects,
  parseNumber,
  toBool,
} from '../../../../scripts/wiki/text';

describe('parseEffects', () => {
  it.each([
    ['+30% Movement Speed', [{ label: 'Movement Speed', value: 30, unit: '%' }]],
    ['25% less damage', [{ label: 'less damage', value: 25, unit: '%' }]],
    ['Take 25% less damage', [{ label: 'less damage', value: 25, unit: '%' }]],
    ['2.5 second cooldown', [{ label: 'cooldown', value: 2.5, unit: 's' }]],
    ['Increases melee damage by 35%', [{ label: 'melee damage', value: 35, unit: '%' }]],
    ['Reduces cooldown by 2 seconds', [{ label: 'cooldown', value: -2, unit: 's' }]],
    ['35% damage reduction', [{ label: 'damage reduction', value: 35, unit: '%' }]],
    ['−40% potion cooldown', [{ label: 'potion cooldown', value: -40, unit: '%' }]],
    ['Movement speed +30%', [{ label: 'Movement speed', value: 30, unit: '%' }]],
    ['Cooldown: 3s', [{ label: 'Cooldown', value: 3, unit: 's' }]],
    ['Spawns 3 wolves', [{ label: 'Spawns wolves', value: 3, unit: 'flat' }]],
    ['Deals 5 damage for 2,5 seconds', [{ label: 'damage for', value: 5, unit: 'flat' }]],
  ])('%s', (text, expected) => {
    expect(parseEffects(text)).toEqual(expected);
  });

  it('splits clauses at new lines, ";", sentences, commas and "and" before a number', () => {
    expect(
      parseEffects(
        '+10% damage and +5% speed; 20% chance. Mobs target you more\n3 second cooldown, 50 souls',
      ),
    ).toEqual([
      { label: 'damage', value: 10, unit: '%' },
      { label: 'speed', value: 5, unit: '%' },
      { label: 'chance', value: 20, unit: '%' },
      { label: 'cooldown', value: 3, unit: 's' },
      { label: 'souls', value: 50, unit: 'flat' },
    ]);
  });

  it('returns nothing for text without a labelled number', () => {
    expect(parseEffects('Mobs target you more')).toEqual([]);
    expect(parseEffects('10%')).toEqual([]);
    expect(parseEffects('Grants nothing by itself')).toEqual([]);
    expect(parseEffects('')).toEqual([]);
  });
});

describe('parseCooldown', () => {
  it.each([
    ['2.5 second cooldown', 2.5],
    ['20 seconds cooldown', 20],
    ['Cooldown: 3s', 3],
    ['cooldown of 20 seconds', 20],
    ['Has a 4,5 sec cooldown', 4.5],
  ])('%s → %d', (text, seconds) => {
    expect(parseCooldown(text)).toBe(seconds);
  });

  it('returns undefined without a cooldown', () => {
    expect(parseCooldown('Lasts 5 seconds')).toBeUndefined();
  });
});

describe('toBool / parseNumber / normalizeName', () => {
  it('maps check marks and words', () => {
    expect(toBool('✔')).toBe(true);
    expect(toBool(' Yes ')).toBe(true);
    expect(toBool('✖')).toBe(false);
    expect(toBool('No')).toBe(false);
    expect(toBool('')).toBe(false);
    expect(toBool('Maybe')).toBeUndefined();
  });

  it('parses unicode minus and decimal commas', () => {
    expect(parseNumber('−40')).toBe(-40);
    expect(parseNumber('–3')).toBe(-3);
    expect(parseNumber('2,5')).toBe(2.5);
  });

  it('strips footnote markers and collapses whitespace but keeps the name', () => {
    expect(normalizeName("  Hunter's Promise[1] ")).toBe("Hunter's Promise");
    expect(normalizeName('Frost Slayer[note 1][key 2][a]')).toBe('Frost Slayer');
  });
});
