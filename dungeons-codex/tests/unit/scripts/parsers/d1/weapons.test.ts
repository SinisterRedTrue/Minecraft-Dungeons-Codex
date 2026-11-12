// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d1/weapons';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { D1WeaponSchema } from '@/lib/schemas';
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
      { title: 'Dungeons:Weapon', revid: 3873343, html: fixture('d1-weapon-list.html') },
      { title: 'Dungeons:Claymore', revid: 3882923, wikitext: fixture('d1-claymore.wiki') },
      { title: 'Dungeons:Katana', revid: 3883027, wikitext: fixture('d1-katana.wiki') },
      { title: 'Dungeons:Hunting Bow', revid: 3834697, wikitext: fixture('d1-hunting-bow.wiki') },
      { title: 'Dungeons:Heartstealer', revid: 3882929, wikitext: fixture('d1-heartstealer.wiki') },
    ]),
  );
});

describe('D1 weapons parser', () => {
  it('reads melee and ranged list tables and skips the Unused ones', () => {
    expect(result.category).toBe('weapons');
    const names = result.drafts.map((d) => d.name);
    expect(names).toContain('Claymore');
    expect(names).toContain('Hunting Bow');
    expect(names).not.toContain('The Monkey Motivator');
    expect(names).not.toContain('Spider Crossbow');
    expect(result.drafts.filter((d) => d.kind === 'ranged').length).toBeGreaterThan(5);
  });

  it('Claymore: list columns, infobox stats and the exact power table', () => {
    const claymore = get('Claymore');
    expect(claymore).toMatchObject({
      id: 'd1:weapons:claymore',
      slug: 'claymore',
      kind: 'melee',
      weaponType: 'claymore',
      isUnique: false,
      rarity: 'common',
      comboLength: 3,
      damageType: 'Melee',
      acceptsSoulEnchantments: false,
      isSeasonal: false,
      properties: ['Powerful pushback'],
      stats: { damage: 11.5, speed: 1, area: 6.5 },
      _image: 'File:MCD Claymore.png',
    });
    expect(claymore.description).toMatch(/^A massive sword that seems impossibly heavy/);
    const table = claymore.powerTable as { power: number; min: number; max: number }[];
    expect(table).toHaveLength(23);
    expect(table[0]).toEqual({ power: 1, min: 18, max: 34 });
    expect(table.at(-1)).toEqual({ power: 108, min: 2065, max: 3823 });
    expect(claymore.source).toMatchObject({
      title: 'Dungeons:Claymore',
      revisionId: 3882923,
      url: 'https://minecraft.wiki/w/Dungeons:Claymore',
    });
  });

  it('links a base item to its unique variants through "Group of"', () => {
    const claymore = get('Claymore');
    expect(claymore.variantIds).toEqual(
      expect.arrayContaining([
        'd1:weapons:broadsword',
        'd1:weapons:heartstealer',
        'd1:weapons:great-axeblade',
      ]),
    );
    const heartstealer = get('Heartstealer');
    expect(heartstealer).toMatchObject({
      isUnique: true,
      rarity: 'unique',
      baseItemId: 'd1:weapons:claymore',
      weaponType: 'claymore',
      properties: ['Powerful pushback', 'Leeches health from mobs'],
    });
    expect(heartstealer._refs).toMatchObject({ builtIn: ['Leeching'], group: 'Claymore' });
  });

  it('Katana: stats from the infobox', () => {
    expect(get('Katana')).toMatchObject({
      kind: 'melee',
      weaponType: 'katana',
      comboLength: 3,
      stats: { damage: 7.9, speed: 1.9, area: 7.2 },
    });
  });

  it('Hunting Bow: a ranged weapon has Ammo, not Area, and no combo', () => {
    const bow = get('Hunting Bow');
    expect(bow.kind).toBe('ranged');
    expect(bow.stats).toEqual({ damage: 4.2, speed: 3.7, ammo: 4.1 });
    expect(bow.comboLength).toBeUndefined();
    expect(bow.weaponType).toBe('hunting-bow');
    expect(bow.variantIds).toEqual(expect.arrayContaining(['d1:weapons:hunters-promise']));
  });

  it('marks rows under a seasonal divider and reads the DLC column', () => {
    expect(get('Haunted Bow')).toMatchObject({ isSeasonal: true, isUnique: true });
    expect(get('Claymore').isSeasonal).toBe(false);
    expect(get('Anchor')._refs).toMatchObject({ dlc: 'Hidden Depths' });
    expect(get('Claymore')._refs).toMatchObject({ dlc: undefined });
  });

  it('keeps raw location lines for the linking pass, and falls back to the list page revision', () => {
    expect((get('Claymore')._refs as { locations: string[] }).locations).toContain(
      'Obsidian Pinnacle',
    );
    // Anchor's page was not served, so its source is the list page.
    expect(get('Anchor').source).toMatchObject({ title: 'Dungeons:Weapon', revisionId: 3873343 });
    expect(get('Anchor').description).toBeUndefined();
  });

  it('produces drafts the weapon schema accepts once linking has run', () => {
    const draft = structuredClone(get('Katana')) as Record<string, unknown>;
    delete draft._image;
    delete draft._refs;
    draft.tags = [];
    expect(D1WeaponSchema.safeParse(draft).success).toBe(true);
  });

  it('states the expected count from the page intro', () => {
    expect(result.expected.note).toMatch(/melee/);
    expect(result.expected.count).toBeGreaterThan(0);
  });
});
