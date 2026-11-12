import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { GAME_IDS } from '@/config/games';
import { forgePropsFor, tierPropsFor } from '@/lib/forge/data';
import type { DetailData } from '@/lib/detail/context';
import { MAX_CATALOG_GZIP_BYTES, readCatalog } from '../../../../scripts/lib/forge-catalog';
import { detailFor, realForgeProps, realTierProps } from '../../../helpers/forge';

describe('forgePropsFor: Dungeons weapons', () => {
  it('hands a weapon its own table, rating and only the curves it needs', () => {
    const props = realForgeProps('d1', 'weapons', 'claymore');
    expect(props).toMatchObject({ game: 'd1', category: 'weapons', target: 'melee', slots: 3 });
    expect(props.item?.powerTable).toHaveLength(23);
    expect(props.item?.rating).toBe(11.5);
    expect(props.item?.curves.type?.powers.at(-1)).toBe(108);
    expect(props.item?.curves.kind?.powers.at(-1)).toBe(251);
    expect(props.item?.curves.baseline?.samples).toBeGreaterThan(10);
    expect(props.speed).toBe(1);
    expect(props.builtIns).toEqual([]);
    // A few kB, not the whole curves file.
    expect(JSON.stringify(props).length).toBeLessThan(12_000);
  });

  it('knows ranged weapons, items without a table and built-in enchantments', () => {
    const bow = realForgeProps('d1', 'weapons', 'trickbow');
    expect(bow.target).toBe('ranged');
    expect(bow.item?.powerTable).toBeUndefined();
    expect(bow.item?.curves.kind?.powers.at(-1)).toBe(108);
    const anchor = realForgeProps('d1', 'weapons', 'anchor');
    expect(anchor.builtIns).toEqual([
      expect.objectContaining({
        slug: 'gravity',
        name: 'Gravity',
        href: '/d1/enchantments/gravity',
      }),
    ]);
    expect(anchor.builtIns[0]?.image).toBe('/images/d1/enchantments/gravity.webp');
  });
});

describe('forgePropsFor: Dungeons armor', () => {
  it('has the health curve, damage reduction and effects', () => {
    const props = realForgeProps('d1', 'armor', 'battle-robe');
    expect(props).toMatchObject({ category: 'armor', target: 'armor', slots: 3 });
    expect(props.item?.powerTable).toHaveLength(23);
    expect(props.item?.curves.kind).toBeDefined();
    expect(props.armor?.baseHealth).toBe(200);
    expect(props.armor?.effects.map((e) => e.label)).toContain('Melee Damage');
    expect(props.speed).toBeUndefined();
  });
});

describe('forgePropsFor: Dungeons II', () => {
  it('has one slot, no power data and the item effects', () => {
    const weapon = realForgeProps('d2', 'weapons', 'twilight-dagger');
    expect(weapon).toMatchObject({ game: 'd2', slots: 1 });
    expect(weapon.item).toBeUndefined();
    expect(weapon.d2?.values).toBeDefined();
    const armor = realForgeProps('d2', 'armor', 'beekeeper-leggings');
    expect(armor).toMatchObject({ game: 'd2', category: 'armor', target: 'armor', slots: 1 });
  });
});

describe('forgePropsFor: everything else', () => {
  it('does not cover other categories or a weapon whose kind is unknown', () => {
    expect(forgePropsFor(detailFor('d1', 'artifacts', 'corrupted-seeds'))).toBeUndefined();
    const partial = {
      game: 'd1',
      category: 'weapons',
      entity: { name: 'X' },
      refs: {},
    } as unknown as DetailData;
    expect(forgePropsFor(partial)).toBeUndefined();
  });
});

describe('tierPropsFor', () => {
  it('lists the tiers and point costs of a D1 enchantment', () => {
    const props = realTierProps('d1', 'enchantments', 'sharpness');
    expect(props.kind).toBe('enchantment');
    expect(props.tiers.map((t) => t.tier)).toEqual([1, 2, 3]);
    expect(props.tiers[2]).toMatchObject({ text: '+33% damage', value: 33, unit: '%' });
    expect(props.pointCost).toEqual([1, 2, 3]);
  });

  it('has no costs for a D2 enchantment and reads talisman tiers', () => {
    expect(realTierProps('d2', 'enchantments', 'fire-aspect').pointCost).toBeUndefined();
    const talisman = tierPropsFor(detailFor('d2', 'talismans', 'amethyst-lens'));
    expect(talisman?.kind).toBe('talisman');
    expect(talisman?.tiers).toHaveLength(3);
  });

  it('is undefined for entities without tiers', () => {
    expect(tierPropsFor(detailFor('d1', 'weapons', 'claymore'))).toBeUndefined();
  });
});

describe('public/forge catalogs', () => {
  for (const game of GAME_IDS) {
    it(`${game}.json is up to date with the generated enchantments and small`, () => {
      const file = readFileSync(
        path.join(process.cwd(), 'public', 'forge', `${game}.json`),
        'utf8',
      );
      expect(JSON.parse(file)).toEqual(readCatalog(process.cwd(), game));
      expect(gzipSync(file).length).toBeLessThan(MAX_CATALOG_GZIP_BYTES);
    });
  }
});
