// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import {
  locationType,
  mobNames,
  parse,
  readNavbox,
} from '../../../../../scripts/parsers/d1/locations';
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
      { title: 'Dungeons:Location', revid: 3880128, html: fixture('d1-location-list.html') },
      {
        title: 'Dungeons:Creeper Woods',
        revid: 3873219,
        wikitext: fixture('d1-creeper-woods.wiki'),
      },
      { title: 'Dungeons:Arch Haven', revid: 3873220, wikitext: fixture('d1-arch-haven.wiki') },
    ]),
  );
});

describe('D1 locations parser', () => {
  it('reads Missions, Secret missions and Sub-missions from the navbox, with their regions', () => {
    const nav = readNavbox(fixture('d1-location-list.html'));
    const find = (name: string) => nav.find((n) => n.name === name);
    expect(find('Creeper Woods')).toMatchObject({ section: 'Missions', region: 'Mainland' });
    expect(find('Gauntlet of Gales')).toMatchObject({
      section: 'Missions',
      region: 'Island realms',
    });
    expect(find('Arch Haven')).toMatchObject({ section: 'Secret missions', region: 'Mainland' });
    expect(find('Creeper Woods Sub-mission')?.section).toBe('Sub-missions');
    expect(find('Creeper Woods')?.image).toBe('File:DungeonsLevelSprite Creeper Woods.png');
  });

  it('leaves out Unused groups and Sub dungeons', () => {
    const names = readNavbox(fixture('d1-location-list.html')).map((n) => n.name);
    expect(names).not.toContain('Andesite Hills');
    expect(names).not.toContain('Slimy Sewers');
    expect(names).not.toContain('Abandoned Cellar');
  });

  it('Creeper Woods: a Mainland mission with its story and mob list', () => {
    const woods = get('Creeper Woods');
    expect(woods).toMatchObject({
      id: 'd1:locations:creeper-woods',
      locationType: 'mission',
      region: 'Mainland',
      mobIds: [],
      itemIds: [],
      _image: 'File:DungeonsLevelSprite Creeper Woods.png',
      source: { title: 'Dungeons:Creeper Woods', revisionId: 3873219 },
    });
    expect(woods.description).toMatch(
      /^The Arch-Illager has come to power using the Orb of Dominance/,
    );
    expect((woods._refs as { mobs: string[] }).mobs).toEqual(
      expect.arrayContaining(['Cow', 'Creeper', 'Zombie']),
    );
  });

  it('Arch Haven: a secret mission, unlocked from Pumpkin Pastures', () => {
    const haven = get('Arch Haven');
    expect(haven.locationType).toBe('secret');
    expect((haven._refs as { unlock: string[] }).unlock).toEqual(['Pumpkin Pastures']);
  });

  it('lists locations whose pages were not found instead of inventing them', () => {
    expect(result.dropped).toContainEqual({ name: 'Camp', reason: 'page not found' });
    expect(result.expected.count).toBeGreaterThan(40);
  });
});

describe('locationType', () => {
  const nav = (section: string) => ({
    title: 'Dungeons:X',
    name: 'X',
    section,
    region: 'Mainland',
  });
  it('maps the navbox sections and the two special locations', () => {
    expect(locationType(nav('Missions'), 'Creeper Woods')).toBe('mission');
    expect(locationType(nav('Secret missions'), 'Arch Haven')).toBe('secret');
    expect(locationType(nav('Sub-missions'), 'Spider Cave')).toBe('other');
    expect(locationType(nav('Missions'), 'Camp')).toBe('camp');
    expect(locationType(nav('Missions'), 'The Tower')).toBe('tower');
  });
});

describe('mobNames', () => {
  it('reads the Minecraft Dungeons table and ignores the Arcade one', () => {
    const wikitext = `== Mobs and entities ==
=== Minecraft Dungeons ===
{| class="wikitable"
! Mob
|-
|{{DuEntityLink|Cow}}
|{{Tc|Yes}}
|-
|{{DuEntityLink|Creeper}}
|}
=== Minecraft Dungeons Arcade ===
{| class="wikitable"
|-
|{{DuEntityLink|Baby Zombie}}
|}`;
    expect(mobNames(wikitext)).toEqual(['Cow', 'Creeper']);
    expect(mobNames('== Trivia ==\nNothing here')).toEqual([]);
  });
});
