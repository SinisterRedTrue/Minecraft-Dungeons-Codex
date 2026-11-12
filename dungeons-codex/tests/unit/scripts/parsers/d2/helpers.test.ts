// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  classifySource,
  leadingValue,
  pairWithBase,
  parseD2Effects,
  singleValue,
  stripRedlink,
  tidy,
} from '../../../../../scripts/parsers/d2/common';
import { meleeFamily, splitEffect } from '../../../../../scripts/parsers/d2/weapons';
import { readAppliesTo } from '../../../../../scripts/parsers/d2/enchantments';
import { parseRewardLines } from '../../../../../scripts/parsers/d2/quests';
import { sourceTypeOf } from '../../../../../scripts/parsers/d2/talismans';

describe('D2 text helpers', () => {
  it('tidy strips leaked sprite file names and editorial brackets', () => {
    expect(tidy('File:Dungeons2Sprite sigil-of-beeswax.pngSigil of Beeswax')).toBe(
      'Sigil of Beeswax',
    );
    expect(tidy('Honeycomb Fields[verify]')).toBe('Honeycomb Fields');
    expect(tidy('File:Dungeons2Sprite scout-point.pngScout point[code-only name]')).toBe(
      'Scout point',
    );
  });

  it('stripRedlink removes the red-link suffix', () => {
    expect(stripRedlink('Dungeons II:Farmer (page does not exist)')).toBe('Dungeons II:Farmer');
    expect(stripRedlink('Dungeons II:Farmer')).toBe('Dungeons II:Farmer');
  });

  it('pairWithBase pairs each unique row with the base row before it', () => {
    const pairs = pairWithBase([false, true, false, true, true]);
    expect(pairs.get(1)).toBe(0);
    expect(pairs.get(3)).toBe(2);
    expect(pairs.get(4)).toBe(2);
    expect(pairs.has(0)).toBe(false);
    expect(pairWithBase([true, false]).size).toBe(0);
  });

  it('classifies drop-location lines', () => {
    expect(classifySource('The Silence in Little Howl (quest reward)')).toMatchObject({
      kind: 'quest',
      name: 'The Silence in Little Howl',
    });
    expect(classifySource('Reward from Gone Fishing')).toMatchObject({
      kind: 'quest',
      name: 'Gone Fishing',
    });
    expect(classifySource('Secret Chest in Rainy Plains')).toMatchObject({
      kind: 'location',
      name: 'Rainy Plains',
    });
    expect(classifySource('Dropped by Mosstrosity')).toMatchObject({
      kind: 'mob',
      name: 'Mosstrosity',
    });
    expect(classifySource('Honeycomb Fields[verify]')).toMatchObject({
      kind: 'location',
      name: 'Honeycomb Fields',
    });
  });
});

describe('parseD2Effects', () => {
  it('labels each number with the rest of its clause', () => {
    expect(parseD2Effects('Frost attacks deal 30% more damage')).toEqual([
      { label: 'Frost attacks deal more damage', value: 30, unit: '%' },
    ]);
    expect(parseD2Effects('Increases souls gained by 60%')).toEqual([
      { label: 'Increases souls gained', value: 60, unit: '%' },
    ]);
    expect(parseD2Effects('Grants an 25% chance to stay in Shadowcloaking when attacking')).toEqual(
      [{ label: 'Grants chance to stay in Shadowcloaking when attacking', value: 25, unit: '%' }],
    );
  });

  it('makes reducing verbs negative', () => {
    expect(parseD2Effects('Reduces ranged ammo cooldown time by 35%.')).toEqual([
      { label: 'Reduces ranged ammo cooldown time', value: -35, unit: '%' },
    ]);
  });

  it('reads seconds and flat counts and ignores the wiki remarks in parentheses', () => {
    expect(parseD2Effects('Lasts 5 seconds (Although unstated, 99% of it)')).toEqual([
      { label: 'Lasts', value: 5, unit: 's' },
    ]);
    expect(parseD2Effects('Pierces 3 enemies')).toEqual([
      { label: 'Pierces enemies', value: 3, unit: 'flat' },
    ]);
  });

  it('splits two numbers at a comma or an "and" between them', () => {
    const values = parseD2Effects('Deals 5% of weapon damage and increases knockback by 125%');
    expect(values.map((v) => v.value)).toEqual([5, 125]);
    expect(parseD2Effects('25% chance, dealing 15% of weapon damage').map((v) => v.value)).toEqual([
      25, 15,
    ]);
  });

  it('keeps "and" inside a clause that has one number', () => {
    expect(
      parseD2Effects(
        'Positive statuses the player applies to themselves and allies last 70% longer',
      )[0]?.label,
    ).toBe('Positive statuses the player applies to themselves and allies last longer');
  });

  it('returns nothing for text without numbers', () => {
    expect(parseD2Effects('Applies Soulsick status to enemies on hit.')).toEqual([]);
  });
});

describe('numbers in tier text', () => {
  it('singleValue needs exactly one number', () => {
    expect(singleValue('20% chance')).toEqual({ value: 20, unit: '%' });
    expect(singleValue('6 second duration')).toEqual({ value: 6, unit: 's' });
    expect(singleValue('1 additional potion')).toEqual({ value: 1 });
    expect(singleValue('25% chance of activation, dealing 15% of weapon damage')).toEqual({});
    expect(singleValue('Slamming into enemies deals damage')).toEqual({});
  });

  it('leadingValue reads the number a talisman tier starts with', () => {
    expect(leadingValue('10%')).toEqual({ value: 10, unit: '%' });
    expect(leadingValue('25%/7000')).toEqual({ value: 25, unit: '%' });
    expect(leadingValue('10% while health is above 95%')).toEqual({ value: 10, unit: '%' });
    expect(leadingValue('7.5')).toEqual({ value: 7.5 });
    expect(leadingValue('N/A')).toEqual({});
  });
});

describe('weapon helpers', () => {
  it('meleeFamily groups by a keyword table and falls back to the base name', () => {
    expect(meleeFamily('Axe')).toBe('axe');
    expect(meleeFamily('Greataxe')).toBe('axe');
    expect(meleeFamily('Pickaxe')).toBe('pickaxe');
    expect(meleeFamily('Battle Hammer')).toBe('hammer');
    expect(meleeFamily('Mob Mallet')).toBe('hammer');
    expect(meleeFamily('Double Sickles')).toBe('sickle');
    expect(meleeFamily('Tidal Sickle')).toBe('sickle');
    expect(meleeFamily('Twilight Dagger')).toBe('dagger');
    expect(meleeFamily('Longsword')).toBe('sword');
    expect(meleeFamily('Short Spear')).toBe('spear');
    expect(meleeFamily('Clobberer')).toBe('clobberer');
    expect(meleeFamily('Meat Cleaver')).toBe('meat-cleaver');
  });

  it('splitEffect separates the wiki remarks from the effect', () => {
    expect(
      splitEffect([
        'Applies Soulsick status to enemies on hit.',
        "(Although unstated, the weapon's regular attacks deal soul damage.)",
      ]),
    ).toEqual({
      effect: 'Applies Soulsick status to enemies on hit.',
      note: "Although unstated, the weapon's regular attacks deal soul damage.",
    });
    expect(splitEffect([])).toEqual({ effect: undefined, note: undefined });
  });
});

describe('enchantment helpers', () => {
  it('readAppliesTo maps the "Applied to" lines', () => {
    expect(readAppliesTo(['Melee Weapon', 'Ranged Weapon'])).toEqual({
      appliesTo: ['melee', 'ranged'],
      restriction: undefined,
    });
    expect(readAppliesTo(['Armor (chestplate exclusive)'])).toEqual({
      appliesTo: ['armor'],
      restriction: 'Chestplate exclusive',
    });
  });
});

describe('talisman helpers', () => {
  it('sourceTypeOf follows the first source line', () => {
    expect(sourceTypeOf([classifySource('Reward from Gone Fishing')])).toBe('quest-reward');
    expect(sourceTypeOf([classifySource('Secret Chest in Rainy Plains')])).toBe('secret-chest');
    expect(sourceTypeOf([classifySource('Dropped by Mosstrosity')])).toBe('boss-drop');
    expect(sourceTypeOf([classifySource('Somewhere else')])).toBe('other');
    expect(sourceTypeOf([])).toBe('other');
  });
});

describe('parseRewardLines', () => {
  it('reads XP, items and random gear', () => {
    const [block, ...rest] = parseRewardLines([
      '1,100 Experience',
      'Sigil of Beeswax',
      'Honey Dipper',
      'Random gear from Honeycomb Fields',
    ]);
    expect(rest).toEqual([]);
    expect(block).toEqual({
      when: 'always',
      xp: 1100,
      items: ['Sigil of Beeswax', 'Honey Dipper'],
      random: [
        {
          text: 'Random gear from Honeycomb Fields',
          count: 1,
          kind: 'gear',
          names: ['Honeycomb Fields'],
        },
      ],
    });
  });

  it('counts "2 random pieces of X Armor" and "3 random gears from Y"', () => {
    const [block] = parseRewardLines([
      '1,100 Experience',
      '2 random pieces of Beekeeper Armor',
      '3 random gears from Lullaby Hills',
      'Random piece of Mystic Armor',
    ]);
    expect(block?.random).toEqual([
      {
        text: '2 random pieces of Beekeeper Armor',
        count: 2,
        kind: 'armor',
        names: ['Beekeeper Armor'],
      },
      {
        text: '3 random gears from Lullaby Hills',
        count: 3,
        kind: 'gear',
        names: ['Lullaby Hills'],
      },
      { text: 'Random piece of Mystic Armor', count: 1, kind: 'armor', names: ['Mystic Armor'] },
    ]);
  });

  it('splits First / Subsequent completions and collects an artifact pool', () => {
    const blocks = parseRewardLines([
      'First completion:',
      '1,100 Experience',
      'Phantom Wing',
      'Random artifact between:',
      'Soul Harvester',
      'Warrior Drums',
      "3 random gears from Singer's Meadow",
      'Subsequent completions:',
      '1,000 Experience',
      "Random gear from Singer's Meadow",
    ]);
    expect(blocks.map((b) => b.when)).toEqual(['first', 'subsequent']);
    expect(blocks[0]).toMatchObject({ xp: 1100, items: ['Phantom Wing'] });
    expect(blocks[0]?.random[0]).toEqual({
      text: 'Random artifact between',
      count: 1,
      kind: 'artifact',
      names: ['Soul Harvester', 'Warrior Drums'],
    });
    expect(blocks[0]?.random[1]).toMatchObject({ count: 3, kind: 'gear' });
    expect(blocks[1]).toMatchObject({ xp: 1000, items: [] });
  });

  it('drops the empty leading block before "First completion"', () => {
    expect(parseRewardLines(['First completion:', '550 Experience']).map((b) => b.when)).toEqual([
      'first',
    ]);
    expect(parseRewardLines([])).toEqual([]);
  });
});
