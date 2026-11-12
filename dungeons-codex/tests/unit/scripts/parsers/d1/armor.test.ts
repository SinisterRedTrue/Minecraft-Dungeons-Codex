// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d1/armor';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
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
      { title: 'Dungeons:Armor', revid: 3873342, html: fixture('d1-armor-list.html') },
      {
        title: "Dungeons:Champion's Armor",
        revid: 3883120,
        wikitext: fixture('d1-champions-armor.wiki'),
      },
    ]),
  );
});

describe('D1 armor parser', () => {
  it('reads every armor table and skips the Unused one', () => {
    const names = result.drafts.map((d) => d.name);
    expect(names).toContain("Champion's Armor");
    expect(names).toContain('Battle Robe');
    expect(names).not.toContain('Ender Armor');
    expect(result.category).toBe('armor');
  });

  it("Champion's Armor: group, damage reduction, effects and the health table", () => {
    const armor = get("Champion's Armor");
    expect(armor).toMatchObject({
      id: 'd1:armor:champions-armor',
      armorGroup: 'champions-armor',
      isUnique: false,
      rarity: 'common',
      baseHealth: 200,
      damageReduction: 35,
      acceptsSoulEnchantments: false,
      properties: ['35% Damage Reduction', '-40% Potion Cooldown', 'Mobs target you more'],
      effects: [
        { label: 'Damage Reduction', value: 35, unit: '%' },
        { label: 'Potion Cooldown', value: -40, unit: '%' },
      ],
      _image: "File:MCD Champion's Armor.png",
    });
    expect(armor.description).toMatch(/^Granted to the champions of the Overworld/);
    const table = armor.powerTable as { power: number; min: number; max: number }[];
    expect(table[0]).toEqual({ power: 1, min: 0, max: 3 });
    expect(table[1]).toEqual({ power: 5, min: 13, max: 17 });
    expect(armor.source).toMatchObject({ title: "Dungeons:Champion's Armor", revisionId: 3883120 });
  });

  it("Hero's Armor is the unique variant of Champion's Armor", () => {
    expect(get("Champion's Armor").variantIds).toEqual(['d1:armor:heros-armor']);
    expect(get("Hero's Armor")).toMatchObject({
      isUnique: true,
      rarity: 'unique',
      baseItemId: 'd1:armor:champions-armor',
      armorGroup: 'champions-armor',
    });
  });

  it('Battle Robe: signed effects keep their sign, and there is no damage reduction', () => {
    const robe = get('Battle Robe');
    expect(robe.effects).toEqual([
      { label: 'Artifact Cooldown', value: -40, unit: '%' },
      { label: 'Melee Damage', value: 30, unit: '%' },
    ]);
    expect(robe.damageReduction).toBeUndefined();
  });

  it('keeps the soul-enchantment column and the seasonal divider', () => {
    expect(get('Phantom Armor').acceptsSoulEnchantments).toBe(true);
    expect(get('Sweet Tooth')).toMatchObject({ isSeasonal: true, isUnique: true });
    expect(get('Battle Robe').isSeasonal).toBe(false);
  });

  it('reads the base health and the armor count from the page intro', () => {
    expect(result.expected.count).toBe(71);
    expect(result.expected.note).toMatch(/71 armors/);
    expect(result.drafts.every((d) => d.baseHealth === 200)).toBe(true);
  });
});
