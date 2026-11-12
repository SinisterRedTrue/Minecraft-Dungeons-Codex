import { describe, expect, it } from 'vitest';
import { deriveListFields } from '@/lib/filters/derive';
import { buildLabels, labelFields } from '@/lib/filters/labels';
import { DEFS, ITEMS, weapon } from './fixtures';

describe('buildLabels', () => {
  const names: Record<string, string> = {
    'd1:locations:creeper-woods': 'Creeper Woods',
    'd1:locations:pumpkin-pastures': 'Pumpkin Pastures!',
    'd1:weapons:daggers': 'Daggers',
    'd1:weapons:hunting-bow': "Hunter's Bow",
    'd1:dlcs:echoing-void': 'Echoing Void',
    'd1:dlcs:flames-of-the-nether': 'Flames of the Nether',
  };
  const lookup = (id: string) => names[id];
  const items = [
    ...ITEMS,
    weapon('Hunting', { weaponType: 'hunting-bow', dlc: 'flames-of-the-nether' }),
  ];

  it('resolves entity ids and slugs naming an entity, shipping only what differs', () => {
    const labels = buildLabels({
      game: 'd1',
      category: 'weapons',
      items,
      fields: ['locations', 'weaponType', 'dlc', 'tags'],
      lookup,
    });
    expect(labels.locations).toEqual({ 'pumpkin-pastures': 'Pumpkin Pastures!' });
    expect(labels.weaponType).toEqual({ 'hunting-bow': "Hunter's Bow" });
    expect(labels.dlc).toBeUndefined();
    expect(labels.tags).toBeUndefined();
  });

  it('does not resolve plain slugs of fields that name nothing, nor unknown ids', () => {
    const labels = buildLabels({
      game: 'd1',
      category: 'weapons',
      items: [weapon('x', { tags: ['dual-wield'], locations: ['d1:locations:unknown'], kind: 7 })],
      fields: ['tags', 'locations', 'kind'],
      lookup,
    });
    expect(labels).toEqual({});
  });

  it('looks each token up once', () => {
    let calls = 0;
    buildLabels({
      game: 'd1',
      category: 'weapons',
      items: [weapon('a', { weaponType: 'x' }), weapon('b', { weaponType: 'x' })],
      fields: ['weaponType'],
      lookup: () => {
        calls += 1;
        return undefined;
      },
    });
    expect(calls).toBe(1);
  });
});

describe('labelFields', () => {
  it('lists option fields once, plus the extra display fields', () => {
    const fields = labelFields(DEFS, ['dlc', 'weaponType', 'tier']);
    expect(fields).toContain('kind');
    expect(fields).toContain('tier');
    expect(fields).not.toContain('stats.damage');
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe('deriveListFields', () => {
  it('derives enchantment cost and the gilded flag', () => {
    expect(
      deriveListFields('d1', 'enchantments', { pointCost: [1, 2, 3], gildedDescription: 'x' }),
    ).toEqual({
      totalCost: 6,
      hasGilded: true,
    });
    expect(deriveListFields('d1', 'enchantments', { gildedDescription: '' })).toEqual({});
    expect(deriveListFields('d1', 'enchantments', {})).toEqual({});
  });

  it('flags mobs with drops', () => {
    expect(deriveListFields('d1', 'mobs', { drops: ['a'] })).toEqual({ hasDrops: true });
    expect(deriveListFields('d2', 'mobs', { drops: [] })).toEqual({});
    expect(deriveListFields('d2', 'mobs', {})).toEqual({});
  });

  it('derives the primary percent effect of a D2 weapon', () => {
    expect(
      deriveListFields('d2', 'weapons', { effectValues: [{ label: 'x', value: 70, unit: '%' }] }),
    ).toEqual({
      primaryEffect: 70,
    });
    expect(
      deriveListFields('d2', 'weapons', { effectValues: [{ label: 'x', value: 2, unit: 's' }] }),
    ).toEqual({});
    expect(deriveListFields('d2', 'weapons', { effectValues: [] })).toEqual({});
    expect(
      deriveListFields('d2', 'weapons', { effectValues: [{ unit: '%', value: 'x' }] }),
    ).toEqual({});
  });

  it('derives D2 armor damage reduction from "take less damage" effects only', () => {
    const effectValues = [
      { label: 'Companions take less damage', value: 10, unit: '%' },
      { label: 'Take less damage from ranged attacks', value: 15, unit: '%' },
    ];
    expect(deriveListFields('d2', 'armor', { effectValues })).toEqual({ damageReduction: 15 });
    expect(
      deriveListFields('d2', 'armor', {
        effectValues: [
          { label: 'Reduces damage taken from elemental attacks', value: -25, unit: '%' },
        ],
      }),
    ).toEqual({ damageReduction: 25 }); // the parser reads "Reduces … by 25%" as -25
    expect(
      deriveListFields('d2', 'armor', { effectValues: [{ label: 'Take less damage' }] }),
    ).toEqual({});
    expect(deriveListFields('d2', 'armor', { effectValues: [{ value: 5 }, 'x'] })).toEqual({});
    expect(deriveListFields('d2', 'armor', {})).toEqual({});
  });

  it('derives the tier III value of a talisman', () => {
    expect(deriveListFields('d2', 'talismans', { tiers: [{}, {}, { value: 25 }] })).toEqual({
      tierIIIValue: 25,
    });
    expect(deriveListFields('d2', 'talismans', { tiers: [{}, {}, { text: 'N/A' }] })).toEqual({});
    expect(deriveListFields('d2', 'talismans', {})).toEqual({});
  });

  it('derives quest XP and reward items', () => {
    const rewards = [
      { when: 'first', xp: 500, items: ['d2:weapons:a', 'raw'] },
      { when: 'subsequent', xp: 200, items: ['d2:weapons:a'] },
      null,
    ];
    expect(deriveListFields('d2', 'quests', { rewards })).toEqual({
      maxXp: 500,
      rewardItems: ['d2:weapons:a', 'raw'],
    });
    expect(deriveListFields('d2', 'quests', { rewards: [{ when: 'always', items: [] }] })).toEqual(
      {},
    );
    expect(deriveListFields('d2', 'quests', {})).toEqual({});
  });

  it('derives nothing for other categories', () => {
    expect(deriveListFields('d1', 'weapons', { anything: 1 })).toEqual({});
  });
});
