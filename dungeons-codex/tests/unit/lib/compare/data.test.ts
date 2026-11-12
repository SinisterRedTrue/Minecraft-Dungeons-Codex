// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { comparableCategories, getCategoryConfig } from '@/config/categories';
import { isComparable } from '@/config/comparable';
import { GAMES, GAME_IDS } from '@/config/games';
import { buildCompareEntries, cellFor, type CompareSource } from '@/lib/compare/build';
import type { CompareEntry } from '@/lib/compare/types';
import { MAX_COMPARE_GZIP_BYTES } from '../../../../scripts/lib/compare-data';

const root = process.cwd();
const read = <T>(...parts: string[]): T =>
  JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

const names = new Map<string, string>([
  ['d1:enchantments:gravity', 'Gravity'],
  ['d1:armor:ghostly-armor', 'Ghostly Armor'],
]);
const nameOf = (id: string) => names.get(id);

const row = (over: Partial<Parameters<typeof cellFor>[0]> & { field: string }) =>
  ({ label: 'Row', format: 'text', ...over }) as Parameters<typeof cellFor>[0];

describe('cellFor', () => {
  const source = {
    stats: { damage: 11.5 },
    weaponType: 'claymore',
    appliesTo: ['melee', 'ranged'],
    properties: ['Powerful pushback', 'Slow'],
    builtInEnchantments: [{ enchantmentId: 'd1:enchantments:gravity' }],
    drops: ['d1:armor:ghostly-armor', 'd1:armor:unknown-thing'],
    levels: [
      { level: 1, text: '+10%' },
      { level: 3, text: '+30%' },
    ],
    tiers: [{ tier: 2, text: '15%' }],
    mobIds: ['a', 'b', 'c'],
    stackable: false,
    health: 'Regular: 8',
    empty: [],
  };

  it('reads numbers through the path DSL, and keeps false', () => {
    expect(cellFor(row({ field: 'stats.damage', format: 'decimal' }), source, nameOf)).toBe(11.5);
    expect(cellFor(row({ field: 'stackable', format: 'bool' }), source, nameOf)).toBe(false);
    expect(cellFor(row({ field: 'health' }), source, nameOf)).toBe('Regular: 8');
  });

  it('keeps one label as a string and several as a list', () => {
    expect(cellFor(row({ field: 'weaponType', format: 'label' }), source, nameOf)).toBe('claymore');
    expect(cellFor(row({ field: 'appliesTo', format: 'label' }), source, nameOf)).toEqual([
      'melee',
      'ranged',
    ]);
  });

  it('turns list rows into lines: text, resolved ids, spelled-out unknown ids, level texts', () => {
    const list = (field: string) => cellFor(row({ field, format: 'list' }), source, nameOf);
    expect(list('properties')).toEqual(['Powerful pushback', 'Slow']);
    expect(list('builtInEnchantments.enchantmentId')).toEqual(['Gravity']);
    expect(list('drops')).toEqual(['Ghostly Armor', 'Unknown Thing']);
    expect(list('levels')).toEqual(['I: +10%', 'III: +30%']);
    expect(list('tiers')).toEqual(['II: 15%']);
  });

  it('counts list entries', () => {
    expect(cellFor(row({ field: 'mobIds', format: 'count' }), source, nameOf)).toBe(3);
  });

  it('has no cell for missing or empty data', () => {
    expect(cellFor(row({ field: 'nope' }), source, nameOf)).toBeUndefined();
    expect(cellFor(row({ field: 'empty', format: 'list' }), source, nameOf)).toBeUndefined();
  });
});

describe('buildCompareEntries', () => {
  it('keeps slug, name, image and rarity, and only the cells that exist', () => {
    const entries = buildCompareEntries(
      [row({ field: 'comboLength', format: 'int' }), row({ field: 'ammo', format: 'int' })],
      [
        {
          slug: 'a',
          name: 'A',
          game: 'd1',
          category: 'weapons',
          rarity: 'rare',
          image: { src: '/images/d1/weapons/a.webp' },
          comboLength: 3,
        } satisfies CompareSource,
        { slug: 'b', name: 'B', game: 'd1', category: 'weapons' },
      ],
      nameOf,
    );
    expect(entries).toEqual([
      {
        s: 'a',
        n: 'A',
        i: '/images/d1/weapons/a.webp',
        r: 'rare',
        v: { comboLength: 3 },
      },
      { s: 'b', n: 'B', v: {} },
    ]);
  });

  it('adds the derived list fields (D2 armor damage reduction)', () => {
    const [entry] = buildCompareEntries(
      [row({ field: 'damageReduction', format: 'percent' })],
      [
        {
          slug: 'x',
          name: 'X',
          game: 'd2',
          category: 'armor',
          effectValues: [{ label: 'Reduces damage taken', value: -25, unit: '%' }],
        },
      ],
      nameOf,
    );
    expect(entry?.v.damageReduction).toBe(25);
  });
});

describe('which categories compare', () => {
  it('is every category except the Dungeons DLCs', () => {
    const all = GAME_IDS.flatMap((g) => GAMES[g].categories.map((c) => ({ g, c })));
    const off = all.filter(({ g, c }) => !isComparable(g, c));
    expect(off).toEqual([{ g: 'd1', c: 'dlcs' }]);
    // The standalone rule and the display configs agree.
    for (const { g, c } of all) {
      expect(isComparable(g, c), `${g}/${c}`).toBe(
        (getCategoryConfig(g, c)?.compareRows.length ?? 0) > 0,
      );
    }
    expect(comparableCategories('d1').map((c) => c.slug)).toEqual([
      'weapons',
      'armor',
      'enchantments',
      'artifacts',
      'cosmetics',
      'mobs',
      'locations',
    ]);
    expect(comparableCategories('d2')).toHaveLength(8);
  });
});

describe('the built compare files (public/compare)', () => {
  const pairs = GAME_IDS.flatMap((game) =>
    GAMES[game].categories.flatMap((category) => {
      const config = getCategoryConfig(game, category);
      return config && config.compareRows.length > 0 ? [{ game, category, config }] : [];
    }),
  );

  it.each(pairs)('$game/$category: complete, current and small', ({ game, category, config }) => {
    const file = path.join(root, 'public', 'compare', game, `${category}.json`);
    expect(existsSync(file), `${file} (run npm run data:index)`).toBe(true);
    const entries = read<CompareEntry[]>('public', 'compare', game, `${category}.json`);
    const entities = read<CompareSource[]>('data', 'generated', game, `${category}.json`);

    // One entry per entity, in the same order, so a stale file shows up here.
    expect(entries.map((e) => e.s)).toEqual(entities.map((e) => e.slug));

    // Every row shows something for at least one item (a row nobody has data for is a typo).
    for (const r of config.compareRows) {
      expect(
        entries.some((e) => e.v[r.field] !== undefined),
        `${game}/${category}: row "${r.label}" (${r.field}) has no data`,
      ).toBe(true);
    }

    const gzip = gzipSync(readFileSync(file)).length;
    expect(gzip).toBeLessThan(MAX_COMPARE_GZIP_BYTES);
  });
});
