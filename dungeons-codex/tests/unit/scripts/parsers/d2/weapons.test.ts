// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse, readWeaponTables } from '../../../../../scripts/parsers/d2/weapons';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { D2WeaponSchema } from '@/lib/schemas';
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
          title: 'Dungeons II:Weapon',
          revid: fixtureRevision('d2-weapon-list.html'),
          html: fixture('d2-weapon-list.html'),
        },
        {
          title: "Dungeons II:Hunter's Hatchet",
          revid: fixtureRevision('d2-hunters-hatchet.wiki'),
          wikitext: fixture('d2-hunters-hatchet.wiki'),
        },
        {
          title: 'Dungeons II:Bow',
          revid: fixtureRevision('d2-bow.wiki'),
          wikitext: fixture('d2-bow.wiki'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 weapons parser', () => {
  it('reads the melee, bow, crossbow and unobtainable tables', () => {
    expect(result.category).toBe('weapons');
    expect(readWeaponTables(fixture('d2-weapon-list.html'))).toHaveLength(4);
    expect(result.drafts.filter((d) => d.kind === 'melee' && d.obtainable)).toHaveLength(58);
    expect(result.drafts.filter((d) => d.weaponType === 'bow')).toHaveLength(12);
    expect(result.drafts.filter((d) => d.weaponType === 'crossbow')).toHaveLength(10);
    expect(result.drafts.filter((d) => d.obtainable === false)).toHaveLength(4);
    expect(result.expected.count).toBe(84);
  });

  it('Axe: a base weapon with no fixed effect, paired with its unique variant', () => {
    expect(get('Axe')).toMatchObject({
      id: 'd2:weapons:axe',
      kind: 'melee',
      weaponType: 'axe',
      rarity: 'common',
      isUnique: false,
      comboLength: 3,
      effectValues: [],
      variantIds: ['d2:weapons:hunters-hatchet'],
      obtainable: true,
      _image: 'File:MCD2 Render Axe Icon.png',
    });
    expect(get('Axe')).not.toHaveProperty('effect');
    expect(get('Axe')).not.toHaveProperty('baseItemId');
  });

  it("Hunter's Hatchet: effect, parsed value, base item, flavor text and page source", () => {
    const hatchet = get("Hunter's Hatchet");
    expect(hatchet).toMatchObject({
      id: 'd2:weapons:hunters-hatchet',
      rarity: 'unique',
      isUnique: true,
      weaponType: 'axe',
      baseItemId: 'd2:weapons:axe',
      effect: 'Reduces ranged ammo cooldown time by 35%.',
      effectValues: [{ label: 'Reduces ranged ammo cooldown time', value: -35, unit: '%' }],
      comboLength: 3,
      description: 'For the experienced hunter who knows how to fletch their own arrows.',
    });
    expect(hatchet.source).toMatchObject({
      title: "Dungeons II:Hunter's Hatchet",
      url: "https://minecraft.wiki/w/Dungeons_II:Hunter's_Hatchet",
    });
  });

  it('keeps the wiki remarks apart from the effect', () => {
    const blade = get('Lullaby Blade');
    expect(blade.effect).toBe('Applies Soulsick status to enemies on hit.');
    expect(blade.effectNote).toMatch(
      /^Although unstated, the weapon's regular attacks deal soul damage/,
    );
    expect(blade.weaponType).toBe('cookiecutter');
  });

  it('Bow: ranged, ammo as a number, flavor text from its page', () => {
    expect(get('Bow')).toMatchObject({
      kind: 'ranged',
      weaponType: 'bow',
      ammo: 15,
      variantIds: ['d2:weapons:rangers-promise'],
      description: "A hunter's best friend, repurposed for hunting Illagers and monsters.",
    });
    expect(get('Bow')).not.toHaveProperty('comboLength');
    expect(get('The Shackler')).toMatchObject({
      kind: 'ranged',
      weaponType: 'crossbow',
      baseItemId: 'd2:weapons:crossbow',
    });
  });

  it('flags the unobtainable weapons and keeps their pairs', () => {
    expect(get('Tornado Blade')).toMatchObject({
      obtainable: false,
      baseItemId: 'd2:weapons:twinblade',
      weaponType: 'twinblade',
    });
    expect(get('Tornado Blade')).not.toHaveProperty('comboLength');
    expect(get('Twinblade').obtainable).toBe(false);
  });

  it('collects drop-location lines with their kind for the linking pass', () => {
    const refs = get('Axe')._refs as { sources: { kind: string; name: string }[] };
    expect(refs.sources.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'quest:The Silence in Little Howl',
      'location:Honeycomb Fields',
      'location:Howling Woods',
    ]);
  });

  it('produces drafts that match the schema once linked and finished', () => {
    const draft = structuredClone(get("Hunter's Hatchet")) as Record<string, unknown>;
    delete draft._image;
    delete draft._refs;
    draft.locations = ['Howling Woods'];
    draft.tags = ['cooldown'];
    expect(D2WeaponSchema.safeParse(draft).success).toBe(true);
  });
});
