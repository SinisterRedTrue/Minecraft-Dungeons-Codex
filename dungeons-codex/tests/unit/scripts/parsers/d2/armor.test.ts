// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse, readArmorTables } from '../../../../../scripts/parsers/d2/armor';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
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
          title: 'Dungeons II:Armor',
          revid: fixtureRevision('d2-armor-list.html'),
          html: fixture('d2-armor-list.html'),
        },
        {
          title: 'Dungeons II:Beekeeper Veil',
          revid: fixtureRevision('d2-beekeeper-veil.wiki'),
          wikitext: fixture('d2-beekeeper-veil.wiki'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 armor parser', () => {
  it('reads one table per slot, with the icon column named Icon or Sprite', () => {
    const tables = readArmorTables(fixture('d2-armor-list.html'));
    expect(tables).toHaveLength(4);
    expect(tables.map((t) => t[0]?.slot)).toEqual(['helmet', 'chestplate', 'leggings', 'boots']);
    // The wiki's table has no icon for this one piece; the sync takes it from the item page.
    expect(
      tables
        .flat()
        .filter((row) => !row.icon)
        .map((row) => row.name),
    ).toEqual(['Soul Corruptor Sandals']);
  });

  it('Beekeeper Veil: a base helmet with its set, slot and icon', () => {
    expect(get('Beekeeper Veil')).toMatchObject({
      id: 'd2:armor:beekeeper-veil',
      slot: 'helmet',
      armorSet: 'Beekeeper Armor',
      rarity: 'common',
      isUnique: false,
      effects: [],
      effectValues: [],
      variantIds: ['d2:armor:hivemind-hardhat'],
      description: 'Keeps enemies out of your face without compromising your vision.',
      _image: 'File:MCD2 Render Beekeeper Veil Icon.png',
    });
  });

  it('Hivemind Hardhat: the unique piece of the paired set, with its effect value', () => {
    expect(get('Hivemind Hardhat')).toMatchObject({
      rarity: 'unique',
      isUnique: true,
      armorSet: 'Hivemind Armor',
      baseItemId: 'd2:armor:beekeeper-veil',
      effects: ['Positive statuses the player applies to themselves and allies last 70% longer'],
    });
    const values = get('Hivemind Hardhat').effectValues as { value: number; unit: string }[];
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ value: 70, unit: '%' });
  });

  it('finds all four pieces of every kept set and reports complete sets', () => {
    const pieces = (set: string) =>
      result.drafts.filter((d) => d.armorSet === set).map((d) => d.slot);
    expect(pieces('Beekeeper Armor').sort()).toEqual(['boots', 'chestplate', 'helmet', 'leggings']);
    expect(pieces('Hivemind Armor').sort()).toEqual(['boots', 'chestplate', 'helmet', 'leggings']);
    expect(result.notes.join(' ')).toMatch(/all \d+ sets have four pieces/);
    expect(result.expected.count).toBe(result.drafts.length);
  });

  it('keeps the quest-reward source of a unique piece', () => {
    const refs = get('Hivemind Hardhat')._refs as { sources: { kind: string; name: string }[] };
    expect(refs.sources).toEqual([
      expect.objectContaining({ kind: 'quest', name: 'Keeper of the Bees' }),
    ]);
  });
});
