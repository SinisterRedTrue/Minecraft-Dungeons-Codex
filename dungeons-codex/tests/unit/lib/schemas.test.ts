// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { allGameCategories, GAMES, isValidCategory, isValidGame } from '@/config/games';
import { LIST_FIELDS } from '@/config/categories';
import { D1WeaponSchema, entityIdSchema, openEnum, schemaFor } from '@/lib/schemas';
import { VALID } from '../helpers/entities';

const issuesOf = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((i) => i.path.join('.')) ?? [];

describe('games registry', () => {
  it('has 8 categories per game and 16 pairs', () => {
    expect(GAMES.d1.categories).toHaveLength(8);
    expect(GAMES.d2.categories).toHaveLength(8);
    expect(allGameCategories()).toHaveLength(16);
    expect(GAMES.d2).toMatchObject({
      name: 'Minecraft Dungeons II',
      short: 'Dungeons II',
      year: 2026,
    });
  });

  it('validates games and categories per game', () => {
    expect(isValidGame('d1')).toBe(true);
    expect(isValidGame('d3')).toBe(false);
    expect(isValidGame('toString')).toBe(false);
    expect(isValidCategory('d1', 'dlcs')).toBe(true);
    expect(isValidCategory('d2', 'dlcs')).toBe(false);
    expect(isValidCategory('d2', 'talismans')).toBe(true);
  });

  it('declares list fields for every pair', () => {
    for (const { game, category } of allGameCategories()) {
      expect((LIST_FIELDS[game] as Record<string, unknown>)[category]).toBeDefined();
    }
  });
});

describe('schemaFor', () => {
  it.each(allGameCategories().map(({ game, category }) => `${game}/${category}`))(
    '%s accepts a minimal valid entity',
    (key) => {
      const [game, category] = key.split('/') as ['d1', 'weapons'];
      const result = schemaFor(game, category).safeParse(VALID[key]!('Test Thing'));
      expect(issuesOf(result)).toEqual([]);
    },
  );

  it('throws for an unknown category', () => {
    expect(() => schemaFor('d2', 'dlcs' as never)).toThrow(/Unknown category/);
  });

  it('requires the id to be game:category:slug and the image path to use the slug', () => {
    const bad = VALID['d1/weapons']!('Claymore', {
      id: 'd1:weapons:other',
      image: { src: '/images/d1/weapons/other.webp', width: 64, height: 64, alt: 'Claymore' },
    });
    expect(issuesOf(D1WeaponSchema.safeParse(bad))).toEqual(['id', 'image.src']);
  });

  it('rejects unknown fields, bad slugs, wrong game literal and wrong rarity per game', () => {
    const d1 = schemaFor('d1', 'weapons');
    expect(issuesOf(d1.safeParse(VALID['d1/weapons']!('Claymore', { extra: 1 })))).toEqual(['']);
    expect(
      issuesOf(d1.safeParse(VALID['d1/weapons']!('Claymore', { slug: 'Clay More' }))),
    ).toContain('slug');
    expect(issuesOf(d1.safeParse(VALID['d1/weapons']!('Claymore', { game: 'd2' })))).toContain(
      'game',
    );
    expect(issuesOf(d1.safeParse(VALID['d1/weapons']!('Claymore', { rarity: 'special' })))).toEqual(
      ['rarity'],
    );
    const d2 = schemaFor('d2', 'weapons');
    expect(issuesOf(d2.safeParse(VALID['d2/weapons']!('Staff', { rarity: 'special' })))).toEqual(
      [],
    );
  });

  it('checks references are ids of the same game', () => {
    const d1 = schemaFor('d1', 'weapons');
    const result = d1.safeParse(
      VALID['d1/weapons']!('Claymore', {
        related: ['d2:weapons:staff'],
        variantIds: ['d1:weapons:heartstealer', 'nope'],
        builtInEnchantments: [{ enchantmentId: 'd1:enchantments:sharpness', level: 4 }],
      }),
    );
    expect(issuesOf(result)).toEqual(['related.0', 'variantIds.1', 'builtInEnchantments.0.level']);
    expect(entityIdSchema('d2').safeParse('d2:talismans:amethyst-lens').success).toBe(true);
    expect(entityIdSchema('d1').safeParse('d1:talismans:amethyst-lens').success).toBe(false);
  });

  it('accepts weapon stats with extra numeric keys and a power table', () => {
    const result = D1WeaponSchema.safeParse(
      VALID['d1/weapons']!('Hunting Bow', {
        kind: 'ranged',
        weaponType: 'bow',
        stats: { damage: 4.2, speed: 3.7, ammo: 4.1 },
        powerTable: [{ power: 1, min: 12, max: 31 }],
        ammo: 'arrows',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('enforces tuples (enchantment point costs, talisman tiers)', () => {
    const ench = schemaFor('d1', 'enchantments');
    expect(
      issuesOf(ench.safeParse(VALID['d1/enchantments']!('Sharpness', { pointCost: [1, 2] }))),
    ).toEqual(['pointCost']);
    const tal = schemaFor('d2', 'talismans');
    const wrongOrder = VALID['d2/talismans']!('Lens', {
      tiers: [
        { tier: 2, text: 'a' },
        { tier: 1, text: 'b' },
        { tier: 3, text: 'c' },
      ],
    });
    expect(issuesOf(tal.safeParse(wrongOrder))).toEqual(['tiers.0.tier', 'tiers.1.tier']);
  });

  it('restricts open enums to the vocab when one is given', () => {
    const vocab = { weaponType: ['sword', 'claymore'] };
    const schema = schemaFor('d1', 'weapons', { vocab });
    expect(
      schema.safeParse(VALID['d1/weapons']!('Claymore', { weaponType: 'claymore' })).success,
    ).toBe(true);
    expect(
      issuesOf(schema.safeParse(VALID['d1/weapons']!('Claymore', { weaponType: 'spoon' }))),
    ).toEqual(['weaponType']);
    // Without a vocab entry any non-empty string passes.
    expect(
      schemaFor('d1', 'weapons').safeParse(VALID['d1/weapons']!('X', { weaponType: 'spoon' }))
        .success,
    ).toBe(true);
    expect(openEnum('mobType', { vocab }).safeParse('anything').success).toBe(true);
    expect(openEnum('mobType').safeParse('  ').success).toBe(false);
  });

  it('validates ISO dates and URLs', () => {
    const dlc = schemaFor('d1', 'dlcs');
    expect(
      issuesOf(dlc.safeParse(VALID['d1/dlcs']!('Jungle Awakens', { releaseDate: '2020-07-01' }))),
    ).toEqual([]);
    expect(
      issuesOf(dlc.safeParse(VALID['d1/dlcs']!('Jungle Awakens', { releaseDate: 'July 2020' }))),
    ).toEqual(['releaseDate']);
    const badSource = VALID['d1/dlcs']!('X', {
      source: { title: 'X', url: 'not a url', revisionId: 1, fetchedAt: 'yesterday' },
    });
    expect(issuesOf(dlc.safeParse(badSource))).toEqual(['source.url', 'source.fetchedAt']);
  });
});
