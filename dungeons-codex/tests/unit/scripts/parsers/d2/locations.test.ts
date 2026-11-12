// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import {
  parse,
  readLocationRows,
  readRiftAreas,
} from '../../../../../scripts/parsers/d2/locations';
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
          title: 'Dungeons II:Location',
          revid: fixtureRevision('d2-location-list.html'),
          html: fixture('d2-location-list.html'),
        },
        {
          title: 'Dungeons II:Howling Woods',
          revid: fixtureRevision('d2-howling-woods.wiki'),
          wikitext: fixture('d2-howling-woods.wiki'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 locations parser', () => {
  it('reads the Overworld and Sift tables (9 locations) and the 7 Rift areas', () => {
    const rows = readLocationRows(fixture('d2-location-list.html'));
    expect(rows.map((r) => r.type)).toEqual([
      ...Array<string>(6).fill('overworld'),
      ...Array<string>(3).fill('sift'),
    ]);
    expect(readRiftAreas(fixture('d2-location-list.html')).map((r) => r.name)).toEqual([
      'Badlands',
      'Cherry Grove',
      'Mountain',
      "Harlow's Village",
      'Savanna',
      'Swampland',
      'Ancient City',
    ]);
    expect(result.drafts).toHaveLength(16);
  });

  it('Howling Woods: two table rows merge, stations and sub-areas stay as text', () => {
    expect(get('Howling Woods')).toMatchObject({
      id: 'd2:locations:howling-woods',
      locationType: 'overworld',
      region: 'Overworld',
      stations: [
        'Little Howl Hamlet',
        'Deep Dark Entrance',
        "Woodcutter's Outpost",
        'Hidden Grove',
      ],
      subAreas: ['The Deep Dark', 'Wishing Well', "Witch's Hut", 'Spider Caves', 'Lush Caves'],
      itemIds: [],
      questIds: [],
    });
    expect(get('Howling Woods').description).toMatch(/^Howling Woods is a location/);
    expect(get('Howling Woods')._image).toMatch(/^File:Dungeons2Sprite howling-woods/);
  });

  it("Howling Woods: the page's Mobs sections name the mobs found there", () => {
    const refs = get('Howling Woods')._refs as { mobs: string[] };
    expect(refs.mobs).toEqual(
      expect.arrayContaining(['Zombie', 'Villager', 'Soul Corrupted Witch']),
    );
    expect(refs.mobs).toContain('Cleric Apprentice');
  });

  it('Squid Coast has no stations or sub-areas ("None" is not a name)', () => {
    expect(get('Squid Coast')).toMatchObject({
      stations: [],
      subAreas: [],
      locationType: 'overworld',
    });
  });

  it("Singer's Meadow is in the Sift", () => {
    expect(get("Singer's Meadow")).toMatchObject({ locationType: 'sift', region: 'The Sift' });
  });

  it('Rift areas are DLC locations with their nested areas', () => {
    expect(get('Badlands')).toMatchObject({
      locationType: 'rift',
      dlc: 'the-rift',
      region: 'The Rift',
      subAreas: ["Prime Enchanter's Base", 'Pillager Outpost'],
    });
    expect(get('Ancient City').subAreas).toEqual(['Undercity']);
    expect(get('Cherry Grove').subAreas).toEqual([]);
  });
});
