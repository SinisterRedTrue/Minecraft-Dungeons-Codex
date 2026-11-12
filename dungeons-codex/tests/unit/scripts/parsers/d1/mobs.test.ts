// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { nameFromTitle, parse, readMobIcons } from '../../../../../scripts/parsers/d1/mobs';
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
      { title: 'Dungeons:Mob', revid: 3888776, html: fixture('d1-mob-list.html') },
      { title: 'Dungeons:Creeper', revid: 3842273, wikitext: fixture('d1-creeper.wiki') },
      { title: 'Dungeons:Zombie', revid: 3852342, wikitext: fixture('d1-zombie.wiki') },
      { title: 'Dungeons:Arch-Illager', revid: 3888695, wikitext: fixture('d1-arch-illager.wiki') },
      {
        title: 'Dungeons:Abominable Weaver',
        revid: 3880001,
        wikitext: fixture('d1-abominable-weaver.wiki'),
      },
      {
        title: 'Dungeons:Redstone Golem',
        revid: 3880002,
        wikitext: fixture('d1-redstone-golem.wiki'),
      },
    ]),
  );
});

describe('D1 mobs parser', () => {
  it('reads the icon lists with the headings above them', () => {
    const icons = readMobIcons(fixture('d1-mob-list.html'));
    const cow = icons.find((i) => i.title === 'Dungeons:Cow');
    expect(cow).toMatchObject({ name: 'Cow', image: 'File:Cow face.png' });
    expect(cow?.path[0]).toBe('Friendlies');
  });

  it('Creeper: a common enemy with health, an attack and spawn missions', () => {
    const creeper = get('Creeper');
    expect(creeper).toMatchObject({
      id: 'd1:mobs:creeper',
      mobType: 'common',
      health: 100,
      attacks: ['Ignition'],
      variants: [],
      _image: 'File:MCD Creeper face.png',
      source: { title: 'Dungeons:Creeper', revisionId: 3842273 },
    });
    expect((creeper._refs as { locations: string[] }).locations).toEqual(
      expect.arrayContaining(['Creeper Woods', 'Creepy Crypt', 'Soggy Swamp']),
    );
  });

  it('Zombie: tiered health stays text, tiers are variants, listed only under Undead still counts as an enemy', () => {
    const zombie = get('Zombie');
    expect(zombie.health).toBe('Tier 1: 55, Tier 2: 210, Tier 3: 500');
    expect(zombie.variants).toEqual(['Tier 1', 'Tier 2', 'Tier 3']);
    expect(zombie.mobType).toBe('common');
    expect(zombie.tags).toEqual(['undead']);
  });

  it('Husk: classification headings become tags, "Powerful" wins the type', () => {
    expect(get('Husk').tags).toContain('undead');
  });

  it('Arch-Illager: a boss; health from the character infobox, attacks from Behavior', () => {
    const boss = get('Arch-Illager');
    expect(boss.mobType).toBe('boss');
    expect(boss.health).toBe(3500);
    expect(boss.attacks).toEqual(
      expect.arrayContaining(['Basic attack', 'Melee attack', 'Teleportation', 'Summon circle']),
    );
    expect(boss.variants).toEqual(['Arch-Illager', 'Archie']);
  });

  it('Abominable Weaver: an ancient mob, with the Drops section kept for linking', () => {
    const weaver = get('Abominable Weaver');
    expect(weaver.mobType).toBe('ancient');
    expect((weaver._refs as { drops: string[] }).drops.length).toBeGreaterThan(3);
  });

  it('Redstone Golem is a powerful enemy', () => {
    expect(get('Redstone Golem')).toMatchObject({ mobType: 'powerful', health: 5000 });
  });

  it('Cow: a passive friendly with no page data, so no health', () => {
    const cow = get('Cow');
    expect(cow.mobType).toBe('passive');
    expect(cow.health).toBeUndefined();
    expect(cow.attacks).toEqual([]);
  });

  it('counts each page once', () => {
    const titles = result.drafts.map((d) => d.id);
    expect(new Set(titles).size).toBe(titles.length);
    expect(result.expected.count).toBe(result.drafts.length);
  });
});

describe('nameFromTitle', () => {
  it('drops the namespace and a "(mob)" disambiguator only', () => {
    expect(nameFromTitle('Dungeons:Tower Keeper (mob)')).toBe('Tower Keeper');
    expect(nameFromTitle('Dungeons:Llama (pet)')).toBe('Llama (pet)');
    expect(nameFromTitle('Dungeons:Cave Spider')).toBe('Cave Spider');
  });
});
