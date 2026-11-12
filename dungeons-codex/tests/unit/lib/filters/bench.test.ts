import { describe, expect, it } from 'vitest';
import { applyFilters, facetCounts } from '@/lib/filters/engine';
import type { FilterDef, FilterState, Item } from '@/lib/filters/types';

/** 06-FILTERS-SPEC: 1,000 synthetic items × 12 filters apply in under 10 ms. */
const TYPES = ['sword', 'daggers', 'claymore', 'glaive', 'bow', 'crossbow', 'axe', 'hammer'];
const TAGS = Array.from({ length: 24 }, (_, i) => `tag-${i}`);

const items: Item[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `d1:weapons:item-${i}`,
  name: `Item ${i}`,
  kind: i % 2 === 0 ? 'melee' : 'ranged',
  weaponType: TYPES[i % TYPES.length],
  rarity: ['common', 'rare', 'unique'][i % 3],
  isUnique: i % 3 === 2,
  stats: { damage: (i % 28) / 2, speed: 1 + (i % 40) / 10 },
  tags: [TAGS[i % TAGS.length], TAGS[(i * 7) % TAGS.length]],
  locations: [`d1:locations:loc-${i % 30}`],
  comboLength: i % 10,
  dlc: i % 4 === 0 ? undefined : `dlc-${i % 4}`,
}));

const t = (key: string, field: string, level: 1 | 2 = 1): FilterDef => ({
  kind: 'type',
  key,
  param: key,
  label: key,
  field,
  level,
  options: 'auto',
});
const range = (key: string, field: string, step: number): FilterDef => ({
  kind: 'range',
  key,
  param: key,
  label: key,
  field,
  step,
});
const multi = (key: string, field: string, match: 'any' | 'all'): FilterDef => ({
  kind: 'multi',
  key,
  param: key,
  label: key,
  field,
  match,
  options: 'auto',
});

const defs: FilterDef[] = [
  t('kind', 'kind'),
  t('wt', 'weaponType', 2),
  range('dmg', 'stats.damage', 0.5),
  range('spd', 'stats.speed', 0.05),
  range('cl', 'comboLength', 1),
  multi('p', 'tags', 'all'),
  multi('r', 'rarity', 'any'),
  multi('loc', 'locations', 'any'),
  multi('dlc', 'dlc', 'any'),
  { kind: 'toggle', key: 'u', param: 'u', label: 'u', field: 'isUnique', value: true },
  { kind: 'toggle', key: 'u2', param: 'u2', label: 'u2', field: 'isUnique', value: false },
  { kind: 'text', key: 'q', param: 'q', label: 'Search in results', fields: ['name', 'tags'] },
];

const state: FilterState = {
  kind: 'melee',
  wt: 'sword',
  dmg: [2, 12],
  spd: [1.5, 4],
  cl: [0, 9],
  p: ['tag-3'],
  r: ['common', 'rare'],
  loc: ['loc-3', 'loc-4', 'loc-5'],
  dlc: ['dlc-1', 'dlc-2'],
  u2: true,
  q: 'item',
};

describe('filter benchmark (1,000 items × 12 filters)', () => {
  it('applies in under 10 ms', () => {
    applyFilters(items, defs, state); // warm-up: path parsing, bounds and token caches
    const runs = 50;
    const times: number[] = [];
    for (let i = 0; i < runs; i += 1) {
      // A fresh state object each time, as the UI would produce.
      const start = performance.now();
      applyFilters(items, defs, { ...state, dmg: [2 + (i % 3), 12] });
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(runs / 2)] as number;
    expect(median).toBeLessThan(10);
  });

  it('computes facet counts for every option in a few tens of ms', () => {
    facetCounts(items, defs, state);
    const start = performance.now();
    const counts = facetCounts(items, defs, state);
    expect(performance.now() - start).toBeLessThan(50);
    expect(Object.keys(counts)).toEqual(['kind', 'wt', 'p', 'r', 'loc', 'dlc']);
  });
});
