// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d2/enchantments';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { D2EnchantmentSchema } from '@/lib/schemas';
import { fixture, fixtureRevision } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name);
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};

beforeAll(async () => {
  result = await parse(
    fakeContext(
      [
        {
          title: 'Dungeons II:Enchantment',
          revid: fixtureRevision('d2-enchantment-list.html'),
          html: fixture('d2-enchantment-list.html'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 enchantments parser', () => {
  it('reads the 32 obtainable enchantments and not the bullet list of unobtainable ones', () => {
    expect(result.category).toBe('enchantments');
    expect(result.drafts).toHaveLength(32);
    expect(result.expected.count).toBe(32);
    const names = result.drafts.map((d) => d.name);
    expect(names).not.toContain('Critical Rampage');
    expect(names).not.toContain("Mage's Familiar");
  });

  it('Soul Blast: melee only, tier values, and the quest that rewards it', () => {
    const draft = get('Soul Blast');
    expect(draft).toMatchObject({
      id: 'd2:enchantments:soul-blast',
      appliesTo: ['melee'],
      description: 'Jump attack wave deals damage and deals additional soul damage over time.',
      levels: [
        { level: 1, text: '50% chance', value: 50, unit: '%' },
        { level: 2, text: '60% chance', value: 60, unit: '%' },
        { level: 3, text: '75% chance', value: 75, unit: '%' },
      ],
      _image: 'File:MCD2 Soul Blast icon.png',
    });
    expect(draft._refs).toEqual({
      sources: [expect.objectContaining({ kind: 'quest', name: 'Illager Intelligence' })],
    });
  });

  it('Bottomless Brew: armor with the chestplate restriction', () => {
    expect(get('Bottomless Brew')).toMatchObject({
      appliesTo: ['armor'],
      restriction: 'Chestplate exclusive',
      levels: [
        { level: 1, text: '1 additional potion', value: 1 },
        { level: 2, text: '2 additional potions', value: 2 },
        { level: 3, text: '3 additional potions', value: 3 },
      ],
    });
  });

  it('Ender Mines: applies to melee and ranged weapons', () => {
    expect(get('Ender Mines').appliesTo).toEqual(['melee', 'ranged']);
  });

  it('keeps the text but no value when a tier has several numbers or none', () => {
    const thundering = get('Thundering').levels as { text: string; value?: number }[];
    expect(thundering[0]).toEqual({
      level: 1,
      text: '25% chance of activation, dealing 15% of weapon damage',
    });
    const cow = get('Cow Stampede').levels as { text: string; value?: number }[];
    expect(cow.every((l) => l.value === undefined)).toBe(true);
  });

  it('matches the schema once linked and finished', () => {
    const draft = structuredClone(get('Soul Blast')) as Record<string, unknown>;
    delete draft._image;
    delete draft._refs;
    draft.obtaining = ['d2:quests:illager-intelligence'];
    expect(D2EnchantmentSchema.safeParse({ ...draft, quality: 'verified' }).success).toBe(true);
  });
});
