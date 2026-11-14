import { describe, expect, it } from 'vitest';
import {
  FACET_ALL,
  applyFilters,
  boundsFor,
  countActive,
  countMissing,
  facetCounts,
  isNarrowed,
  isShown,
  rangeBounds,
  rangeField,
  sortItems,
  stateList,
  stateRange,
  stateString,
  tokensOf,
} from '@/lib/filters/engine';
import type { FilterState, SortDef } from '@/lib/filters/types';
import {
  COMBO,
  DAMAGE,
  DEFS,
  DLC,
  EFFECT,
  EFFECT_STRENGTH,
  ITEMS,
  KIND,
  PROPS,
  RARITY,
  SORT,
  SPEED,
  TEXT,
  UNIQUE,
  UNOBTAINABLE,
  WEAPON_TYPE,
  weapon,
} from './fixtures';

const names = (items: readonly { name?: unknown }[]) => items.map((i) => i.name);
const run = (state: FilterState) => names(applyFilters(ITEMS, DEFS, { uo: true, ...state }));

describe('state accessors', () => {
  it('stateString accepts non-empty strings only', () => {
    expect(stateString('a')).toBe('a');
    expect(stateString('')).toBeUndefined();
    expect(stateString(true)).toBeUndefined();
    expect(stateString(undefined)).toBeUndefined();
  });

  it('stateList accepts arrays only', () => {
    expect(stateList(['a'])).toEqual(['a']);
    expect(stateList('a')).toEqual([]);
    expect(stateList(undefined)).toEqual([]);
  });

  it('stateRange accepts two-number arrays only', () => {
    expect(stateRange([1, 2])).toEqual([1, 2]);
    expect(stateRange('1-2')).toBeUndefined();
    expect(stateRange([1] as never)).toBeUndefined();
    expect(stateRange([1, 2, 3] as never)).toBeUndefined();
    expect(stateRange(['a', 'b'] as never)).toBeUndefined();
    expect(stateRange([1, 'b'] as never)).toBeUndefined();
  });
});

describe('tokensOf', () => {
  it('returns value tokens and caches them per item and field', () => {
    const item = ITEMS[0] as never;
    const first = tokensOf(item, 'locations');
    expect(first).toEqual(['creeper-woods', 'pumpkin-pastures']);
    expect(tokensOf(item, 'locations')).toBe(first);
    expect(tokensOf(item, 'kind')).toEqual(['melee']);
    expect(tokensOf(item, 'nothing')).toEqual([]);
  });
});

describe('isShown', () => {
  it('shows defs without conditions', () => {
    expect(isShown(KIND, {})).toBe(true);
    expect(isShown(PROPS, {})).toBe(true);
  });

  it('follows showWhen with a single value or a list', () => {
    expect(isShown(COMBO, {})).toBe(false);
    expect(isShown(COMBO, { t: 'ranged' })).toBe(false);
    expect(isShown(COMBO, { t: 'melee' })).toBe(true);
    expect(isShown(WEAPON_TYPE, {})).toBe(false);
    expect(isShown(WEAPON_TYPE, { t: 'ranged' })).toBe(true);
    expect(isShown(WEAPON_TYPE, { t: 'other' })).toBe(false);
  });

  it('shows a dependent range only while exactly one value is chosen', () => {
    expect(isShown(EFFECT_STRENGTH, {})).toBe(false);
    expect(isShown(EFFECT_STRENGTH, { fx: ['a', 'b'] })).toBe(false);
    expect(isShown(EFFECT_STRENGTH, { fx: ['movement-speed'] })).toBe(true);
  });
});

describe('rangeField', () => {
  it('returns the field, filling {value} for dependent ranges', () => {
    expect(rangeField(DAMAGE, {})).toBe('stats.damage');
    expect(rangeField(EFFECT_STRENGTH, { fx: ['life-steal'] })).toBe(
      'effects[label=life-steal].value',
    );
    expect(rangeField(EFFECT_STRENGTH, {})).toBe('effects[label=].value');
  });
});

describe('bounds', () => {
  it('widens min/max to the step and caches per list', () => {
    expect(boundsFor(ITEMS, 'stats.damage', 0.5)).toEqual({ min: 3, max: 9 });
    expect(boundsFor(ITEMS, 'stats.speed', 0.05)).toEqual({ min: 1.5, max: 3.25 });
    expect(boundsFor(ITEMS, 'stats.speed', 1)).toEqual({ min: 1, max: 4 });
    expect(boundsFor(ITEMS, 'stats.damage', 0.5)).toEqual({ min: 3, max: 9 });
  });

  it('is null when no item has the field (and remembers it)', () => {
    expect(boundsFor(ITEMS, 'stats.area', 1)).toBeNull();
    expect(boundsFor(ITEMS, 'stats.area', 1)).toBeNull();
  });

  it('rangeBounds is null for a hidden range', () => {
    expect(rangeBounds(ITEMS, COMBO, {})).toBeNull();
    expect(rangeBounds(ITEMS, COMBO, { t: 'melee' })).toEqual({ min: 1, max: 4 });
  });

  it('isNarrowed compares with the bounds', () => {
    const b = { min: 3, max: 9 };
    expect(isNarrowed([3, 9], b)).toBe(false);
    expect(isNarrowed([4, 9], b)).toBe(true);
    expect(isNarrowed([3, 8], b)).toBe(true);
  });
});

describe('applyFilters', () => {
  it('returns every item for an empty state (hidden defs never filter)', () => {
    expect(applyFilters(ITEMS, DEFS, { uo: true })).toHaveLength(5);
    expect(applyFilters(ITEMS, DEFS, { cl: [2, 4], wt: 'bow' })).toHaveLength(4);
  });

  it('hides unobtainable items until the toggle is on', () => {
    expect(names(applyFilters(ITEMS, DEFS, {}))).not.toContain('Crossbow');
    expect(names(applyFilters(ITEMS, DEFS, { uo: true }))).toContain('Crossbow');
  });

  it('filters by type, level 2 type and ignores a level 2 type without its parent', () => {
    expect(run({ t: 'ranged' })).toEqual(['Bow', 'Crossbow']);
    expect(run({ t: 'melee', wt: 'daggers' })).toEqual(['Daggers']);
    expect(run({ wt: 'daggers' })).toHaveLength(5);
  });

  it('filters by range and drops items without the stat once narrowed', () => {
    expect(run({ dmg: [5, 8] })).toEqual(['Sword', 'Daggers']);
    expect(run({ dmg: [3, 9] })).toHaveLength(5);
    expect(run({ spd: [3, 4] })).toEqual(['Daggers']);
  });

  it('ignores a malformed or out-of-data range', () => {
    expect(run({ dmg: 'x' as never })).toHaveLength(5);
    expect(run({ t: 'melee', cl: [3, 4] })).toEqual(['Sword', 'Daggers']);
  });

  it('matches multis with any / all and the none option', () => {
    expect(run({ r: ['rare', 'unique'] })).toEqual(['Daggers', 'Crossbow', 'Hammer']);
    expect(run({ p: ['charged-shots', 'dual-wield'] })).toEqual(['Crossbow']);
    expect(run({ p: ['dual-wield'] })).toEqual(['Sword', 'Daggers', 'Crossbow']);
    expect(run({ dlc: ['base-game'] })).toEqual(['Sword', 'Bow', 'Hammer']);
    expect(run({ dlc: ['base-game', 'echoing-void'] })).toHaveLength(5);
    expect(run({ dlc: ['echoing-void'] })).toEqual(['Daggers', 'Crossbow']);
    expect(run({ r: [] })).toHaveLength(5);
  });

  it('applies toggles', () => {
    expect(run({ u: true })).toEqual(['Daggers', 'Crossbow']);
    expect(run({ u: false as never })).toHaveLength(5);
  });

  it('filters a dependent range on the chosen effect', () => {
    expect(run({ fx: ['movement-speed'], fxv: [20, 30] })).toEqual(['Sword']);
    expect(run({ fx: ['movement-speed'], fxv: [10, 30] })).toHaveLength(2);
    expect(run({ fx: ['movement-speed', 'life-steal'], fxv: [20, 30] })).toEqual(['Daggers']);
  });

  it('searches names and tags, ignoring case, hyphens and apostrophes', () => {
    expect(run({ q: 'sword' })).toEqual(['Sword']);
    expect(run({ q: 'DUAL wield' })).toEqual(['Sword', 'Daggers', 'Crossbow']);
    expect(run({ q: 'dual crossbow' })).toEqual(['Crossbow']);
    expect(run({ q: "daggers'" })).toEqual(['Daggers']);
    expect(run({ q: 'zzz' })).toEqual([]);
    expect(run({ q: '   ' })).toHaveLength(5);
  });

  it('combines filters', () => {
    expect(run({ t: 'melee', u: true, p: ['dual-wield'], dmg: [6, 9] })).toEqual(['Daggers']);
  });
});

describe('facetCounts', () => {
  it('counts each option with the other filters applied', () => {
    const counts = facetCounts(ITEMS, DEFS, { uo: true, t: 'melee' });
    expect(counts.kind).toMatchObject({ melee: 3, ranged: 2, [FACET_ALL]: 5 });
    expect(counts.weaponType).toMatchObject({ sword: 1, daggers: 1, hammer: 1, [FACET_ALL]: 3 });
    expect(counts.weaponType?.bow).toBeUndefined();
  });

  it('keeps level 1 counts when a level 2 type is chosen', () => {
    const counts = facetCounts(ITEMS, DEFS, { uo: true, t: 'melee', wt: 'daggers' });
    expect(counts.kind).toMatchObject({ melee: 3, ranged: 2 });
    expect(counts.weaponType).toMatchObject({ daggers: 1, sword: 1 });
  });

  it('an any-multi ignores its own selection, an all-multi keeps it', () => {
    const counts = facetCounts(ITEMS, DEFS, { uo: true, r: ['unique'], p: ['dual-wield'] });
    expect(counts.rarity).toMatchObject({ common: 1, unique: 2, [FACET_ALL]: 3 });
    // rarity=unique AND dual-wield: Daggers and Crossbow
    expect(counts.props).toMatchObject({ 'dual-wield': 2, 'fast-thrusts': 1, [FACET_ALL]: 2 });
    expect(counts.props?.['charged-shots']).toBe(1);
  });

  it('counts the none option for items without a value', () => {
    const counts = facetCounts(ITEMS, DEFS, { uo: true });
    expect(counts.dlc).toMatchObject({ 'base-game': 3, 'echoing-void': 2 });
  });

  it('only reports type and multi filters that are shown', () => {
    const counts = facetCounts(ITEMS, DEFS, {});
    expect(Object.keys(counts).sort()).toEqual(['dlc', 'effect', 'kind', 'props', 'rarity']);
  });
});

describe('countMissing', () => {
  it('counts items hidden only because they lack the stat', () => {
    expect(countMissing(ITEMS, DEFS, { uo: true, dmg: [4, 8] }, DAMAGE)).toBe(1);
    expect(countMissing(ITEMS, DEFS, { dmg: [4, 8] }, DAMAGE)).toBe(0);
    expect(countMissing(ITEMS, DEFS, { uo: true, t: 'ranged', dmg: [4, 8] }, DAMAGE)).toBe(1);
    expect(countMissing(ITEMS, DEFS, { uo: true, t: 'melee', dmg: [4, 8] }, DAMAGE)).toBe(0);
  });
});

describe('sortItems', () => {
  it('sorts by name, numbers and ranks in both directions', () => {
    expect(names(sortItems(ITEMS, SORT, 'name-asc'))).toEqual([
      'Bow',
      'Crossbow',
      'Daggers',
      'Hammer',
      'Sword',
    ]);
    expect(names(sortItems(ITEMS, SORT, 'name-desc'))[0]).toBe('Sword');
    expect(names(sortItems(ITEMS, SORT, 'dmg-desc')).slice(0, 4)).toEqual([
      'Hammer',
      'Daggers',
      'Sword',
      'Bow',
    ]);
    expect(names(sortItems(ITEMS, SORT, 'dmg-asc')).slice(0, 4)).toEqual([
      'Bow',
      'Sword',
      'Daggers',
      'Hammer',
    ]);
    expect(names(sortItems(ITEMS, SORT, 'rarity-desc'))).toEqual([
      'Crossbow',
      'Daggers',
      'Hammer',
      'Bow',
      'Sword',
    ]);
  });

  it('puts items without the field last in either direction, ordered by name', () => {
    expect(names(sortItems(ITEMS, SORT, 'dmg-desc')).at(-1)).toBe('Crossbow');
    expect(names(sortItems(ITEMS, SORT, 'dmg-asc')).at(-1)).toBe('Crossbow');
    expect(
      names(
        sortItems(
          [weapon('B'), weapon('A'), weapon('C', { stats: { damage: 1 } })],
          SORT,
          'dmg-asc',
        ),
      ),
    ).toEqual(['C', 'A', 'B']);
  });

  it('compares mixed number and text values', () => {
    const mixed = [
      weapon('A', { health: 'Regular: 8' }),
      weapon('B', { health: 10 }),
      weapon('C', { health: 5 }),
    ];
    expect(names(sortItems(mixed, SORT, 'health-asc'))).toEqual(['C', 'B', 'A']);
    expect(names(sortItems([mixed[0]!, mixed[1]!], SORT, 'health-asc'))).toEqual(['B', 'A']);
  });

  it('ranks equal values by the tiebreaker keys before the name', () => {
    const sort = {
      param: 'sort' as const,
      default: 'rarity-desc',
      options: [
        {
          value: 'rarity-desc',
          label: 'Rarity',
          field: 'rarity',
          dir: 'desc' as const,
          rank: ['common', 'unique'],
          then: [{ field: 'stats.damage', dir: 'desc' as const }],
        },
      ],
    };
    const list = [
      weapon('Alpha', { rarity: 'common', stats: { damage: 3 } }),
      weapon('Beta', { rarity: 'common', stats: { damage: 9 } }),
      weapon('Gamma', { rarity: 'unique', stats: { damage: 1 } }),
      weapon('Delta', { rarity: 'unique' }),
    ];
    // Unique first (strongest, then the one without a stat), then common by damage.
    expect(names(sortItems(list, sort, undefined))).toEqual(['Gamma', 'Delta', 'Beta', 'Alpha']);
  });

  it('breaks ties by name, then id', () => {
    const tied = [
      weapon('Same', { id: 'b', stats: { damage: 1 } }),
      weapon('Same', { id: 'a', stats: { damage: 1 } }),
      weapon('Alpha', { id: 'c', stats: { damage: 1 } }),
    ];
    expect(sortItems(tied, SORT, 'dmg-asc').map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('falls back to the default sort for an unknown value, and to name without options', () => {
    expect(names(sortItems(ITEMS, SORT, 'nope'))).toEqual(
      names(sortItems(ITEMS, SORT, 'name-asc')),
    );
    expect(names(sortItems(ITEMS, SORT, undefined))[0]).toBe('Bow');
    const bare: SortDef = { param: 'sort', options: [], default: 'x' };
    expect(names(sortItems(ITEMS, bare, 'x'))[0]).toBe('Bow');
  });

  it('does not mutate its input', () => {
    const copy = [...ITEMS];
    sortItems(ITEMS, SORT, 'name-desc');
    expect(ITEMS).toEqual(copy);
  });
});

describe('countActive', () => {
  it('counts the filters the user set', () => {
    expect(countActive(ITEMS, DEFS, {})).toBe(0);
    expect(
      countActive(ITEMS, DEFS, {
        t: 'melee',
        wt: 'sword',
        dmg: [4, 9],
        p: ['dual-wield', 'fast-thrusts'],
        u: true,
        q: 'sw',
      }),
    ).toBe(6);
  });

  it('ignores full-bounds ranges, hidden defs, empty values and false toggles', () => {
    expect(
      countActive(ITEMS, DEFS, { dmg: [3, 9], wt: 'sword', cl: [1, 2], u: false as never }),
    ).toBe(0);
    expect(countActive(ITEMS, DEFS, { p: [], q: '' })).toBe(0);
    expect(countActive(ITEMS, DEFS, { fxv: [1, 2] })).toBe(0);
    expect(countActive(ITEMS, DEFS, { dmg: 'x' as never })).toBe(0);
  });

  it('ignores a range for a stat no item has', () => {
    expect(countActive(ITEMS, [{ ...DAMAGE, field: 'stats.area' }], { dmg: [1, 2] })).toBe(0);
  });

  it('keeps the unused defs exercised', () => {
    expect([SPEED, TEXT, UNIQUE, UNOBTAINABLE, DLC, EFFECT, RARITY, PROPS, KIND].length).toBe(9);
  });
});
