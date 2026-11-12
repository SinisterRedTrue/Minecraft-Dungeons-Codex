// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import {
  healthOf,
  linkedNames,
  mobInfobox,
  parse,
  readMobIcons,
} from '../../../../../scripts/parsers/d2/mobs';
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
          title: 'Dungeons II:Mob',
          revid: fixtureRevision('d2-mob-list.html'),
          html: fixture('d2-mob-list.html'),
        },
        {
          title: 'Dungeons II:Zombie',
          revid: fixtureRevision('d2-zombie.wiki'),
          wikitext: fixture('d2-zombie.wiki'),
        },
        {
          title: 'Dungeons II:Echo Golem',
          revid: fixtureRevision('d2-echo-golem.wiki'),
          wikitext: fixture('d2-echo-golem.wiki'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 mobs parser', () => {
  it('reads the icon lists with the headings above them', () => {
    const icons = readMobIcons(fixture('d2-mob-list.html'));
    const golem = icons.find((i) => i.title === 'Dungeons II:Echo Golem');
    expect(golem).toMatchObject({ name: 'Echo Golem' });
    expect(golem?.image).toMatch(/^File:/);
    expect(golem?.path).toEqual(['Friendlies']);
    expect(icons.find((i) => i.title === 'Dungeons II:Zombie')?.path).toEqual([
      'Enemies',
      'Undead',
    ]);
  });

  it('skips cinematic, unused and promotional-only mobs', () => {
    const names = result.drafts.map((d) => d.name);
    expect(names).not.toContain('Armadillo');
    expect(result.expected.note).toMatch(/skipped/);
  });

  it('Zombie: a common undead enemy with tiered health and its spawn areas', () => {
    expect(get('Zombie')).toMatchObject({
      id: 'd2:mobs:zombie',
      mobType: 'common',
      tags: ['undead'],
      variants: ['Tier 1', 'Tier 2', 'Tier 3'],
      attacks: [],
      drops: [],
    });
    expect(get('Zombie').health).toBe(
      'Regular (tier 1): 8, Regular (tier 2): 36, Regular (tier 3): 52, Soul corrupted (tier 1): 200, Soul corrupted (tier 2): 233, Soul corrupted (tier 3): 266',
    );
    expect((get('Zombie')._refs as { locations: string[] }).locations).toEqual([
      'Deep Dark',
      'Frozen Highlands',
      'Howling Woods',
    ]);
  });

  it('Echo Golem: a passive friendly with no health on its page', () => {
    expect(get('Echo Golem')).toMatchObject({ mobType: 'passive', tags: [] });
    expect(get('Echo Golem')).not.toHaveProperty('health');
  });

  it('uses the strongest heading: a mini-boss Evoker is also an Illager', () => {
    expect(get('Evoker')).toMatchObject({ mobType: 'mini-boss', tags: ['illager'] });
    expect(get('Copper Monstrosity').mobType).toBe('boss');
    expect(get('Cartographer').mobType).toBe('character');
    expect(get('Blacksmith').mobType).toBe('merchant');
    expect(get('Bee').mobType).toBe('companion');
    expect(get('Trill').mobType).toBe('non-attackable');
  });

  it('strips "(page does not exist)" from red-linked mobs', () => {
    expect(result.drafts.some((d) => /page does not exist/i.test(d.name))).toBe(false);
  });

  it('healthOf keeps plain numbers as numbers and tier lists as text', () => {
    expect(healthOf('1400')).toBe(1400);
    expect(healthOf('* Regular: 8\n* Soul corrupted: 133')).toBe('Regular: 8, Soul corrupted: 133');
    expect(healthOf('Unknown')).toBeUndefined();
    expect(healthOf(undefined)).toBeUndefined();
  });

  it('mobInfobox accepts the D2 infobox and the D1 one that shared mobs still use', () => {
    expect(mobInfobox('{{Infobox Dungeons II entity\n| health = 40\n}}')?.health).toBe('40');
    const shared =
      "{{Infobox Dungeons entity\n| spawn=\n* {{MCD2Link|The Sift}}:\n** {{MCD2Link|Singer's Meadow}}\n}}";
    expect(linkedNames(mobInfobox(shared)?.spawn ?? '')).toEqual(['The Sift', "Singer's Meadow"]);
    expect(mobInfobox('no infobox here')).toBeUndefined();
  });

  it('linkedNames reads the page of each MCD2Link', () => {
    expect(
      linkedNames('* {{MCD2Link|id=Deep Dark|The Deep Dark}}\n* {{MCD2Link|Howling Woods}}'),
    ).toEqual(['Deep Dark', 'Howling Woods']);
  });
});
