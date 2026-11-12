import { describe, expect, it } from 'vitest';
import {
  ASIDE_SECTIONS,
  DLC_CONTENT_CATEGORIES,
  HEADER_CHIPS,
  INFOBOX_ROWS,
  STAT_ROWS,
} from '@/config/detail';
import { getCategoryConfig } from '@/config/categories';
import { allGameCategories } from '@/config/games';
import { createLoaders } from '@/lib/data/loaders';
import { buildDetailData } from '@/lib/detail/context';
import { buildChips, buildInfobox, buildStatusBadges } from '@/lib/detail/infobox';
import { detailDescription } from '@/lib/detail/meta';
import { collectIds, refOf, slugIds, slugLink, slugToId, toLink } from '@/lib/detail/refs';
import { buildStats, computeMaxima } from '@/lib/detail/stats';
import { formatEffectValue, nonEmpty, roman } from '@/lib/detail/text';
import type { Entity } from '@/lib/schemas';
import { buildSitemap } from '@/lib/seo';

const loaders = createLoaders();
const ref = (id: string, name: string) => ({
  id,
  game: 'd1' as const,
  category: 'locations',
  slug: id.split(':')[2] ?? '',
  name,
  href: `/d1/locations/${id.split(':')[2]}`,
});

describe('refs', () => {
  it('collects ids deeply and skips the entity itself, sources and tags', () => {
    const ids = collectIds({
      id: 'd1:weapons:self',
      locations: ['d1:locations:a', 'Raw Text'],
      builtInEnchantments: [{ enchantmentId: 'd1:enchantments:b', level: 1 }],
      source: { url: 'd1:locations:ignored' },
      related: ['d1:weapons:ignored'],
      rewards: [{ randomFrom: [{ from: ['d2:armor:c'] }] }],
    });
    expect([...ids].sort()).toEqual(['d1:enchantments:b', 'd1:locations:a', 'd2:armor:c']);
  });

  it('turns slugs into ids and ids into links', () => {
    expect(slugToId('d1', 'weapons', 'dlcs', 'Hidden Depths')).toBe('d1:dlcs:hidden-depths');
    expect(slugToId('d1', 'weapons', 'self', 'anchor')).toBe('d1:weapons:anchor');
    const refs = { 'd1:locations:a': ref('d1:locations:a', 'Creeper Woods') };
    expect(toLink('d1:locations:a', refs)).toMatchObject({
      label: 'Creeper Woods',
      href: '/d1/locations/a',
    });
    expect(toLink('d1:locations:missing-place', refs)).toEqual({ label: 'Missing Place' });
    expect(toLink('chance to negate hits', refs)).toEqual({ label: 'Chance to negate hits' });
    expect(slugLink('d1', 'weapons', 'dlcs', 'the-rift', refs)).toEqual({ label: 'The Rift' });
  });

  it('lists the slug fields of an entity as candidate ids', () => {
    const entity = { game: 'd1', category: 'weapons', dlc: 'x-y', weaponType: 'anchor' };
    expect(slugIds(entity as unknown as Entity)).toEqual(['d1:dlcs:x-y', 'd1:weapons:anchor']);
  });
});

describe('text helpers', () => {
  it('formats numerals and effect values', () => {
    expect([1, 2, 3, 7].map(roman)).toEqual(['I', 'II', 'III', '7']);
    expect(formatEffectValue(70, '%')).toBe('70%');
    expect(formatEffectValue(2.5, 's')).toBe('2.5 s');
    expect(formatEffectValue(10, 'flat')).toBe('10');
    expect(nonEmpty(['a', ' ', 3, '', 'b'])).toEqual(['a', 'b']);
  });
});

describe('stats', () => {
  const specs = [
    { label: 'Damage', field: 'stats.damage' },
    { label: 'Cooldown', field: 'cooldownSeconds', unit: 's' },
  ];
  it('scales to the category max and skips missing stats', () => {
    const maxima = computeMaxima(specs, [{ stats: { damage: 14 } }, { stats: { damage: 7 } }]);
    expect(maxima).toEqual({ 'stats.damage': 14, cooldownSeconds: 0 });
    expect(buildStats(specs, { stats: { damage: 7 } }, maxima)).toEqual([
      { label: 'Damage', value: 7, max: 14 },
    ]);
    // A value above the recorded maximum never overflows its bar.
    expect(buildStats(specs, { cooldownSeconds: 9 }, maxima)).toEqual([
      { label: 'Cooldown', value: 9, max: 9, unit: 's' },
    ]);
  });
});

describe('infobox helpers', () => {
  const refs = {
    'd1:dlcs:hidden-depths': {
      ...ref('d1:dlcs:hidden-depths', 'Hidden Depths'),
      href: '/d1/dlcs/hidden-depths',
    },
  };
  const ctx = { game: 'd1' as const, category: 'weapons', refs };

  it('builds rows only for values that exist', () => {
    const rows = buildInfobox(
      INFOBOX_ROWS.d1.weapons,
      {
        kind: 'melee',
        weaponType: 'anchor',
        rarity: 'rare',
        dlc: 'hidden-depths',
        comboLength: 3,
        acceptsSoulEnchantments: false,
        isSeasonal: false,
      },
      ctx,
    );
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.values.map((v) => v.label)]));
    expect(byLabel).toMatchObject({
      Type: ['Melee'],
      Group: ['Anchor'],
      Rarity: ['Rare'],
      DLC: ['Hidden Depths'],
      Combo: ['3'],
      'Soul enchantments': ['No'],
    });
    expect(rows.find((r) => r.label === 'DLC')?.values[0]?.href).toBe('/d1/dlcs/hidden-depths');
    expect(rows.find((r) => r.label === 'Damage type')).toBeUndefined();
  });

  it('joins costs and counts', () => {
    const [cost] = buildInfobox(
      [{ label: 'Point cost', field: 'pointCost', format: 'join' }],
      { pointCost: [1, 2, 3] },
      ctx,
    );
    expect(cost?.values[0]?.label).toBe('1 / 2 / 3');
    const rows = buildInfobox(
      [{ label: 'Mobs', field: 'mobIds', format: 'size', noun: ['mob', 'mobs'] }],
      { mobIds: ['a', 'b'] },
      ctx,
    );
    expect(rows[0]?.values[0]?.label).toBe('2 mobs');
    expect(
      buildInfobox([{ label: 'Mobs', field: 'mobIds', format: 'size' }], { mobIds: [] }, ctx),
    ).toEqual([]);
  });

  it('builds chips and status badges', () => {
    expect(
      buildChips(HEADER_CHIPS.d1.weapons, { kind: 'ranged', weaponType: 'anchor' }, ctx).map(
        (c) => c.label,
      ),
    ).toEqual(['Ranged', 'Anchor']);
    const badges = buildStatusBadges(
      {
        dlc: 'hidden-depths',
        isSeasonal: true,
        obtainable: false,
        requiresSouls: true,
        isSecret: true,
      },
      ctx,
    );
    expect(badges.map((b) => b.label)).toEqual([
      'Hidden Depths',
      'Seasonal',
      'Unobtainable',
      'Uses souls',
      'Secret',
    ]);
    expect(badges[0]?.href).toBe('/d1/dlcs/hidden-depths');
    expect(buildStatusBadges({}, ctx)).toEqual([]);
  });
});

describe('meta', () => {
  it('prefers the in-game text and never invents stats', () => {
    const base = { name: 'Claymore' } as Entity;
    expect(
      detailDescription(
        { ...base, description: 'A heavy blade.' } as Entity,
        'Weapons',
        'Minecraft Dungeons',
      ),
    ).toBe('A heavy blade.');
    const fallback = detailDescription(base, 'Weapons', 'Minecraft Dungeons');
    expect(fallback.length).toBeLessThanOrEqual(155);
    expect(fallback).toContain('Claymore');
    expect(
      detailDescription({ ...base, summary: 'A DLC.' } as unknown as Entity, 'DLCs', 'x'),
    ).toBe('A DLC.');
  });
});

describe('config against the real data', () => {
  it('has a detail config for every category and only known sections', () => {
    for (const { game, category } of allGameCategories()) {
      const config = getCategoryConfig(game, category);
      expect(config?.detailSections.length, `${game}/${category}`).toBeGreaterThan(0);
      expect(INFOBOX_ROWS[game][category as never]).toBeDefined();
      expect(STAT_ROWS[game][category as never]).toBeDefined();
      expect(HEADER_CHIPS[game][category as never]).toBeDefined();
    }
    expect(ASIDE_SECTIONS).toEqual(['enchantments', 'locations', 'variants']);
    expect(DLC_CONTENT_CATEGORIES).toHaveLength(5);
  });

  it('builds detail data for every entity without throwing', () => {
    let count = 0;
    for (const { game, category } of allGameCategories()) {
      for (const entity of loaders.getAll(game, category as never) as unknown as Entity[]) {
        const data = buildDetailData(loaders, entity);
        expect(data.infobox.length, entity.id).toBeGreaterThan(0);
        // Every link a page shows leads to a real page.
        for (const row of data.infobox) {
          for (const value of row.values) {
            if (value.href) expect(value.href).toMatch(/^\/d[12]\/[a-z]+\/[a-z0-9-]+$/);
          }
        }
        expect(data.related.length).toBeLessThanOrEqual(6);
        count += 1;
      }
    }
    expect(count).toBe(1467);
  });

  it('wires prev/next alphabetically within a category', () => {
    const all = loaders.getAll('d1', 'weapons') as unknown as Entity[];
    const [first, second] = all;
    const firstData = buildDetailData(loaders, first as Entity);
    expect(firstData.prev).toBeUndefined();
    expect(firstData.next?.id).toBe(second?.id);
    expect(buildDetailData(loaders, all.at(-1) as Entity).next).toBeUndefined();
  });

  it('lists DLC contents and the D2 set, and links both ways', () => {
    const dlc = (loaders.getAll('d1', 'dlcs') as unknown as Entity[]).find((d) =>
      (loaders.getAll('d1', 'weapons') as unknown as Entity[]).some((w) => w.dlc === d.slug),
    ) as Entity;
    const data = buildDetailData(loaders, dlc);
    const weapons = data.dlcContents.find((g) => g.category === 'weapons');
    expect(weapons?.items.length).toBeGreaterThan(0);
    // The weapon's own page links back to the DLC.
    const weaponEntity = loaders.getByIds([weapons?.items[0]?.id ?? ''])[0] as Entity;
    const weaponData = buildDetailData(loaders, weaponEntity);
    expect(weaponData.badges.find((b) => b.variant === 'dlc')?.href).toBe(refOf(dlc).href);

    const armor = (loaders.getAll('d2', 'armor') as unknown as Entity[])[0] as Entity;
    const set = buildDetailData(loaders, armor).setPieces;
    expect(set.map((p) => p.id)).toContain(armor.id);
    expect(set.length).toBeGreaterThanOrEqual(2);
  });

  it('links locations and the items found there in both directions', () => {
    const location = (
      loaders.getAll('d1', 'locations') as unknown as (Entity & { itemIds: string[] })[]
    ).find((l) => l.itemIds.length > 0) as Entity & { itemIds: string[] };
    const itemId = location.itemIds[0] as string;
    const item = loaders.getByIds([itemId])[0] as Entity & { locations?: string[] };
    expect(item.locations).toContain(location.id);
    const itemData = buildDetailData(loaders, item);
    expect(itemData.refs[location.id]?.href).toBe(refOf(location).href);
    expect(buildDetailData(loaders, location).refs[itemId]?.href).toBe(refOf(item).href);
  });

  it('gives core quests a story order', () => {
    const core = (
      loaders.getAll('d2', 'quests') as unknown as (Entity & {
        questType: string;
        order?: number;
      })[]
    ).filter((q) => q.questType === 'core');
    const middle = core.find((q) => q.order === 2) as Entity;
    const order = buildDetailData(loaders, middle).questOrder;
    expect(order?.position).toBe(2);
    expect(order?.previous).toBeDefined();
    expect(order?.next).toBeDefined();
  });
});

describe('sitemap with details', () => {
  it('has the static pages plus one URL per entity', () => {
    const details = allGameCategories().flatMap(({ game, category }) =>
      (loaders.getAll(game, category as never) as unknown as Entity[]).map((e) => ({
        game,
        category,
        slug: e.slug,
      })),
    );
    const urls = buildSitemap({}, 'https://x.test', details);
    expect(details).toHaveLength(1467);
    expect(urls).toHaveLength(1467 + 20);
    expect(new Set(urls.map((u) => u.url)).size).toBe(urls.length);
    expect(urls.some((u) => u.url === `https://x.test/d1/weapons/${details[0]?.slug}`)).toBe(true);
  });
});
