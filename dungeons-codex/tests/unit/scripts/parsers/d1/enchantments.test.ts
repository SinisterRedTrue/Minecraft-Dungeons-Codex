// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse, parseLevelValue, readCosts } from '../../../../../scripts/parsers/d1/enchantments';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { parseWikitables } from '../../../../../scripts/wiki/tables';
import { fixture } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name);
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};

beforeAll(async () => {
  result = await parse(
    fakeContext([
      { title: 'Dungeons:Enchantment', revid: 3873258, html: fixture('d1-enchantment-list.html') },
    ]),
  );
});

describe('D1 enchantments parser', () => {
  it('reads the point costs from the Overview table', () => {
    const costs = readCosts(parseWikitables(fixture('d1-enchantment-list.html')));
    expect(costs).toEqual({ common: [1, 2, 3], powerful: [2, 3, 4] });
    expect(result.notes.join(' ')).toMatch(/common 1\/2\/3, powerful 2\/3\/4/);
  });

  it('Sharpness: a common melee enchantment with parsed tier values', () => {
    expect(get('Sharpness')).toMatchObject({
      id: 'd1:enchantments:sharpness',
      appliesTo: ['melee'],
      tier: 'common',
      pointCost: [1, 2, 3],
      isGilded: false,
      gildedDescription: 'Extra Damage',
      stackable: true,
      mobObtainable: false,
      section: 'standard',
      levels: [
        { level: 1, text: '+10% damage', value: 10, unit: '%' },
        { level: 2, text: '+21% damage', value: 21, unit: '%' },
        { level: 3, text: '+33% damage', value: 33, unit: '%' },
      ],
    });
    expect(get('Sharpness').description).toBe(
      "Sharpens the player's weapon, causing it to deal more damage.",
    );
    expect((get('Sharpness')._refs as { builtInto: string[] }).builtInto).toEqual(
      expect.arrayContaining(['Broadsword', 'Diamond Sword', 'Frost Slayer']),
    );
    expect(get('Sharpness')._image).toBe('File:MCD Sharpness.png');
  });

  it('Fire Aspect: one entity for the Melee and Ranged rows, tiers without numbers stay text', () => {
    const fire = get('Fire Aspect');
    expect(fire.appliesTo).toEqual(['melee', 'ranged']);
    expect(fire.levels).toEqual([
      { level: 1, text: 'X damage per second' },
      { level: 2, text: '1.25X damage per second' },
      { level: 3, text: '1.5X damage per second' },
    ]);
    expect(result.drafts.filter((d) => d.name === 'Fire Aspect')).toHaveLength(1);
  });

  it('Prospector appears in three tables and applies to all of them', () => {
    expect(get('Prospector').appliesTo).toEqual(['melee', 'ranged', 'armor']);
  });

  it('Rushdown: an exclusive powerful enchantment; "#" in the tier text becomes the number', () => {
    expect(get('Rushdown')).toMatchObject({
      section: 'exclusive',
      tier: 'powerful',
      pointCost: [2, 3, 4],
      levels: [
        { level: 1, text: '1 seconds', value: 1 },
        { level: 2, text: '2 seconds', value: 2 },
        { level: 3, text: '3 seconds', value: 3 },
      ],
    });
    expect((get('Rushdown')._refs as { builtInto: string[] }).builtInto).toEqual(
      expect.arrayContaining(['Tempest Knife', 'Chill Gale Knife']),
    );
  });

  it('leaves tier and point cost out when the wiki lists the cost as Unknown', () => {
    const shot = get('Shadow Shot');
    expect(shot.tier).toBeUndefined();
    expect(shot.pointCost).toBeUndefined();
    expect(shot.levels).toEqual([]);
    expect(shot.section).toBe('exclusive');
  });

  it('skips the Unused table', () => {
    const names = result.drafts.map((d) => d.name);
    expect(names).not.toContain('Heals Allies');
    expect(names).not.toContain('Barrier');
    expect(result.expected.note).toMatch(/8 unused skipped/);
  });
});

describe('parseLevelValue', () => {
  it('reads plain numbers and percentages only', () => {
    expect(parseLevelValue('20%')).toEqual({ value: 20, unit: '%' });
    expect(parseLevelValue('+25%')).toEqual({ value: 25, unit: '%' });
    expect(parseLevelValue('1.5')).toEqual({ value: 1.5 });
    expect(parseLevelValue('-5%')).toEqual({ value: -5, unit: '%' });
    expect(parseLevelValue('+X')).toEqual({});
    expect(parseLevelValue('Next 2')).toEqual({});
    expect(parseLevelValue('fifth')).toEqual({});
  });
});
