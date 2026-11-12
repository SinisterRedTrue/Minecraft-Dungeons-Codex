// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLoaders, defaultDataDir } from '@/lib/data/loaders';
import type { Entity } from '@/lib/schemas';
import { VALID } from '../helpers/entities';

let dir: string;

function write(game: string, category: string, entities: unknown) {
  mkdirSync(path.join(dir, game), { recursive: true });
  writeFileSync(path.join(dir, game, `${category}.json`), JSON.stringify(entities));
}

const W = VALID['d1/weapons']!;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'codex-data-'));
  write('d1', 'weapons', [
    W('Broadsword', { isUnique: true, baseItemId: 'd1:weapons:claymore', weaponType: 'claymore' }),
    W('Claymore', {
      weaponType: 'claymore',
      variantIds: ['d1:weapons:broadsword', 'd1:weapons:heartstealer'],
      stats: { damage: 11.5 },
      powerTable: [{ power: 1, min: 18, max: 34 }],
    }),
    W('Great Axeblade', { weaponType: 'claymore', related: ['d1:weapons:sword'] }),
    W('Heartstealer', {
      isUnique: true,
      baseItemId: 'd1:weapons:claymore',
      weaponType: 'claymore',
      source: {
        title: 'x',
        url: 'https://minecraft.wiki/w/x',
        revisionId: 2,
        fetchedAt: '2026-11-13T08:00:00.000Z',
      },
    }),
    W('Sword', {
      weaponType: 'sword',
      related: ['d1:mobs:zombie', 'd1:nope:x', 'd2:weapons:staff'],
    }),
  ]);
  write('d1', 'mobs', [VALID['d1/mobs']!('Zombie')]);
  write('d2', 'weapons', [VALID['d2/weapons']!('Staff')]);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

describe('createLoaders', () => {
  it('getAll reads a category and treats a missing file as empty', () => {
    const data = createLoaders(dir);
    expect(data.getAll('d1', 'weapons').map((w) => w.name)).toEqual([
      'Broadsword',
      'Claymore',
      'Great Axeblade',
      'Heartstealer',
      'Sword',
    ]);
    expect(data.getAll('d1', 'armor')).toEqual([]);
  });

  it('memoizes each file', () => {
    const data = createLoaders(dir);
    const first = data.getAll('d1', 'weapons');
    write('d1', 'weapons', []);
    expect(data.getAll('d1', 'weapons')).toBe(first);
    expect(createLoaders(dir).getAll('d1', 'weapons')).toEqual([]);
  });

  it('getBySlug finds one entity', () => {
    const data = createLoaders(dir);
    expect(data.getBySlug('d1', 'weapons', 'claymore')?.stats).toEqual({ damage: 11.5 });
    expect(data.getBySlug('d1', 'weapons', 'nope')).toBeUndefined();
  });

  it('getListItems projects base fields + list fields only', () => {
    const [claymore] = createLoaders(dir)
      .getListItems('d1', 'weapons')
      .filter((i) => i.slug === 'claymore');
    expect(claymore).toEqual({
      id: 'd1:weapons:claymore',
      slug: 'claymore',
      name: 'Claymore',
      tags: [],
      quality: 'verified',
      game: 'd1',
      category: 'weapons',
      kind: 'melee',
      weaponType: 'claymore',
      isUnique: false,
      stats: { damage: 11.5 },
      acceptsSoulEnchantments: false,
      isSeasonal: false,
    });
    expect(claymore).not.toHaveProperty('powerTable');
    expect(claymore).not.toHaveProperty('source');
  });

  it('getCounts counts every category of a game', () => {
    expect(createLoaders(dir).getCounts('d1')).toEqual({
      weapons: 5,
      armor: 0,
      enchantments: 0,
      artifacts: 0,
      dlcs: 0,
      cosmetics: 0,
      mobs: 1,
      locations: 0,
    });
    expect(createLoaders(dir).getCounts('d2').weapons).toBe(1);
  });

  it('getByIds resolves ids in order and skips unknown ones', () => {
    const data = createLoaders(dir);
    expect(
      data
        .getByIds([
          'd1:mobs:zombie',
          'd1:weapons:sword',
          'd1:weapons:ghost',
          'x:y:z',
          'd2:dlcs:a',
          'd2:weapons:staff',
        ])
        .map((e) => e.id),
    ).toEqual(['d1:mobs:zombie', 'd1:weapons:sword', 'd2:weapons:staff']);
  });

  it('getRelated lists variants first, then explicit relations, then the same group', () => {
    const data = createLoaders(dir);
    const claymore = data.getBySlug('d1', 'weapons', 'claymore') as Entity;
    expect(data.getRelated(claymore).map((e) => e.slug)).toEqual([
      'broadsword',
      'heartstealer',
      'great-axeblade',
    ]);
    const broadsword = data.getBySlug('d1', 'weapons', 'broadsword') as Entity;
    expect(data.getRelated(broadsword).map((e) => e.slug)).toEqual([
      'claymore',
      'heartstealer',
      'great-axeblade',
    ]);
    expect(data.getRelated(broadsword, 1).map((e) => e.slug)).toEqual(['claymore']);
    const axe = data.getBySlug('d1', 'weapons', 'great-axeblade') as Entity;
    expect(data.getRelated(axe).map((e) => e.slug)).toEqual([
      'sword',
      'broadsword',
      'claymore',
      'heartstealer',
    ]);
  });

  it('getRelated ignores ids that do not resolve and categories without a group field', () => {
    const data = createLoaders(dir);
    const sword = data.getBySlug('d1', 'weapons', 'sword') as Entity;
    expect(data.getRelated(sword).map((e) => e.id)).toEqual(['d1:mobs:zombie', 'd2:weapons:staff']);
    write('d1', 'dlcs', [
      VALID['d1/dlcs']!('Jungle Awakens'),
      VALID['d1/dlcs']!('Creeping Winter'),
    ]);
    const fresh = createLoaders(dir);
    const dlc = fresh.getBySlug('d1', 'dlcs', 'jungle-awakens') as Entity;
    expect(fresh.getRelated(dlc)).toEqual([]);
  });

  it('getSyncDate is the latest fetch date of a game', () => {
    const data = createLoaders(dir);
    expect(data.getSyncDate('d1')).toBe('2026-11-13');
    expect(data.getSyncDate('d2')).toBe('2026-11-12');
    expect(createLoaders(path.join(dir, 'empty')).getSyncDate('d1')).toBeUndefined();
  });

  it('rejects a file that is not an array and rethrows read errors other than ENOENT', () => {
    write('d1', 'armor', { not: 'an array' });
    expect(() => createLoaders(dir).getAll('d1', 'armor')).toThrow(/must contain an array/);
    mkdirSync(path.join(dir, 'd1', 'artifacts.json'));
    expect(() => createLoaders(dir).getAll('d1', 'artifacts')).toThrow();
  });
});

describe('defaultDataDir', () => {
  it('uses CODEX_DATA_DIR when set, else data/generated', () => {
    vi.stubEnv('CODEX_DATA_DIR', dir);
    expect(defaultDataDir()).toBe(dir);
    vi.stubEnv('CODEX_DATA_DIR', undefined as unknown as string);
    expect(defaultDataDir()).toBe(path.join(process.cwd(), 'data', 'generated'));
  });

  it('the module-level loaders read the default directory', async () => {
    vi.stubEnv('CODEX_DATA_DIR', dir);
    vi.resetModules();
    const data = await import('@/lib/data');
    expect(data.getCounts('d1').weapons).toBe(5);
    expect(data.getSyncDate('d2')).toBe('2026-11-12');
    expect(typeof data.getAll).toBe('function');
  });
});
