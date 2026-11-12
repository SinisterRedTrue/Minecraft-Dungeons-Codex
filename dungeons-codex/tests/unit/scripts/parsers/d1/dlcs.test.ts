// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { addedNames, missionNames, parse } from '../../../../../scripts/parsers/d1/dlcs';
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
      {
        title: 'Dungeons:Downloadable content',
        aliases: ['Dungeons:DLC'],
        revid: 3802346,
        html: fixture('d1-dlc-list.html'),
      },
      {
        title: 'Dungeons:Jungle Awakens',
        revid: 3880000,
        wikitext: fixture('d1-jungle-awakens.wiki'),
      },
    ]),
  );
});

describe('D1 DLC parser', () => {
  it('follows the DLC redirect and reads every row of the table', () => {
    expect(result.expected.count).toBe(9);
    expect(result.notes.join(' ')).toContain('Dungeons:Downloadable content');
  });

  it('Jungle Awakens: date, release order, cover, summary and missions', () => {
    const dlc = get('Jungle Awakens');
    expect(dlc).toMatchObject({
      id: 'd1:dlcs:jungle-awakens',
      slug: 'jungle-awakens',
      releaseDate: '2020-07-01',
      order: 1,
      _image: 'File:MinecraftDungeonsJungleAwakens.png',
      contentCounts: { weapons: 0, armor: 0, artifacts: 0, mobs: 0, enchantments: 0 },
      locationIds: [],
    });
    expect(dlc.summary).toMatch(/^Jungle Awakens is the first paid DLC for Minecraft Dungeons\./);
    expect(dlc.summary).toContain('It was released on July 1, 2020.');
    expect(dlc.source).toMatchObject({ title: 'Dungeons:Jungle Awakens', revisionId: 3880000 });
    expect((dlc._refs as { locations: string[] }).locations).toEqual([
      'Dingy Jungle',
      'Overgrown Temple',
      'Panda Plateau',
    ]);
  });

  it('lists the mobs a DLC adds, for the linking pass', () => {
    const refs = get('Jungle Awakens')._refs as {
      mobsAdded: string[];
      enchantmentsAdded: string[];
    };
    expect(refs.mobsAdded).toEqual(expect.arrayContaining(['Abomination Vine', 'Jungle Zombie']));
    expect(refs.enchantmentsAdded).toEqual([]);
  });

  it('drops a DLC whose page gave no summary, and says why', () => {
    expect(result.drafts).toHaveLength(1);
    expect(result.dropped).toHaveLength(8);
    expect(result.dropped[0]).toEqual({
      name: 'Creeping Winter',
      reason: 'no summary paragraph on Dungeons:Creeping Winter',
    });
  });
});

describe('DLC page helpers', () => {
  const wikitext = fixture('d1-jungle-awakens.wiki');

  it('reads mission names and strips the qualifier in brackets', () => {
    expect(missionNames(wikitext)).toEqual(['Dingy Jungle', 'Overgrown Temple', 'Panda Plateau']);
    expect(missionNames('== Gameplay ==\nNothing')).toEqual([]);
  });

  it('reads the Added list of a group, and nothing for a missing group', () => {
    expect(addedNames(wikitext, 'Weapons')).toEqual(expect.arrayContaining(['Whip', 'Vine Whip']));
    expect(addedNames(wikitext, 'Artifacts')).toEqual(['Corrupted Seeds']);
    expect(addedNames(wikitext, 'Gadgets')).toEqual([]);
  });
});
