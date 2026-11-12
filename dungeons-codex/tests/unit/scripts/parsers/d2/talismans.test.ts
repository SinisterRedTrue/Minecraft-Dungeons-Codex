// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d2/talismans';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { D2TalismanSchema } from '@/lib/schemas';
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
          title: 'Dungeons II:Talisman',
          revid: fixtureRevision('d2-talisman-list.html'),
          html: fixture('d2-talisman-list.html'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 talismans parser', () => {
  it('reads all 24 talismans without dropping any', () => {
    expect(result.category).toBe('talismans');
    expect(result.drafts).toHaveLength(24);
    expect(result.dropped).toEqual([]);
    expect(result.drafts.filter((d) => d.isSecret)).toHaveLength(9);
  });

  it('Thrifty Pendant: keeps the raw tier text and parses the leading value', () => {
    expect(get('Thrifty Pendant')).toMatchObject({
      id: 'd2:talismans:thrifty-pendant',
      boostType: 'melee',
      isSecret: true,
      passiveBonus: 'Increases damage based on emerald amounts',
      sourceType: 'secret-chest',
      tiers: [
        { tier: 1, text: '25%/7000', value: 25, unit: '%' },
        { tier: 2, text: '40%/8000', value: 40, unit: '%' },
        { tier: 3, text: '50%/9000', value: 50, unit: '%' },
      ],
      _image: 'File:MCD2 Thrifty Pendant gear icon.png',
    });
  });

  it('Tendrils of the Sprout: conditional tiers keep their condition text', () => {
    expect(get('Tendrils of the Sprout')).toMatchObject({
      boostType: 'melee',
      isSecret: false,
      sourceType: 'quest-reward',
      tiers: [
        { tier: 1, text: '10% while health is above 95%', value: 10, unit: '%' },
        { tier: 2, text: '20% while health is above 85%', value: 20, unit: '%' },
        { tier: 3, text: '40% while health is above 75%', value: 40, unit: '%' },
      ],
    });
  });

  it('pet talismans have N/A tiers without values', () => {
    expect(get('Golem Kit')).toMatchObject({
      boostType: 'pet',
      tiers: [
        { tier: 1, text: 'N/A' },
        { tier: 2, text: 'N/A' },
        { tier: 3, text: 'N/A' },
      ],
    });
    expect(
      (get('Golem Kit').tiers as { value?: number }[]).every((t) => t.value === undefined),
    ).toBe(true);
  });

  it('Amethyst Lens has two sources; the first decides the source type', () => {
    const lens = get('Amethyst Lens');
    expect(lens.sourceType).toBe('quest-reward');
    const refs = lens._refs as { sources: { kind: string; name: string }[] };
    expect(refs.sources.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'quest:The Prime Enchanter Revived',
      'location:Howling Woods',
    ]);
    expect(get('Wonderful Wheat').sourceType).toBe('boss-drop');
  });

  it('matches the schema once linked and finished', () => {
    const draft = structuredClone(get('Thrifty Pendant')) as Record<string, unknown>;
    delete draft._image;
    delete draft._refs;
    draft.locations = ['d2:locations:rainy-plains'];
    expect(D2TalismanSchema.safeParse(draft).success).toBe(true);
  });
});
