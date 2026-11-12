import { describe, expect, it } from 'vitest';
import {
  clearPatch,
  describeActive,
  hasData,
  patchFor,
  sanitizeState,
  tokenUniverse,
} from '@/lib/filters/state';
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
  TEXT,
  UNIQUE,
  UNOBTAINABLE,
  WEAPON_TYPE,
  weapon,
} from './fixtures';

const label = (_def: unknown, token: string) => `L:${token}`;

describe('tokenUniverse', () => {
  it('lists every token in the data, plus the none option when some item has no value', () => {
    expect([...tokenUniverse(ITEMS, KIND)].sort()).toEqual(['melee', 'ranged']);
    expect([...tokenUniverse(ITEMS, DLC)].sort()).toEqual(['base-game', 'echoing-void']);
    expect([...tokenUniverse(ITEMS, PROPS)]).toContain('dual-wield');
  });

  it('has no none option when every item has a value', () => {
    expect([...tokenUniverse(ITEMS, { ...DLC, field: 'kind' })]).not.toContain('base-game');
  });
});

describe('hasData', () => {
  it('needs options for type/multi, bounds for ranges and a match for toggles', () => {
    expect(hasData(ITEMS, KIND, {})).toBe(true);
    expect(hasData(ITEMS, { ...KIND, field: 'nope' }, {})).toBe(false);
    expect(hasData(ITEMS, PROPS, {})).toBe(true);
    expect(hasData(ITEMS, DAMAGE, {})).toBe(true);
    expect(hasData(ITEMS, { ...DAMAGE, field: 'stats.area' }, {})).toBe(false);
    expect(hasData(ITEMS, COMBO, {})).toBe(false);
    expect(hasData(ITEMS, COMBO, { t: 'melee' })).toBe(true);
    expect(hasData(ITEMS, UNIQUE, {})).toBe(true);
    expect(hasData(ITEMS, { ...UNIQUE, field: 'hasDrops' }, {})).toBe(false);
    expect(hasData(ITEMS, UNOBTAINABLE, {})).toBe(true);
    expect(hasData(ITEMS, TEXT, {})).toBe(true);
  });

  it('hides a range whose items all share one value', () => {
    const same = [weapon('A', { stats: { damage: 3 } }), weapon('B', { stats: { damage: 3 } })];
    expect(hasData(same, DAMAGE, {})).toBe(false);
    expect(hasData([...same, weapon('C', { stats: { damage: 4 } })], DAMAGE, {})).toBe(true);
  });
});

describe('sanitizeState', () => {
  it('keeps valid values of every kind', () => {
    const state = {
      t: 'melee',
      wt: 'sword',
      dmg: [4, 8],
      p: ['dual-wield'],
      dlc: ['base-game'],
      u: true,
      q: 'sw',
    } as const;
    expect(sanitizeState(ITEMS, DEFS, state)).toEqual(state);
  });

  it('drops unknown tokens', () => {
    expect(
      sanitizeState(ITEMS, DEFS, { t: 'magic', p: ['nope', 'dual-wield'], dlc: ['x'] }),
    ).toEqual({
      p: ['dual-wield'],
    });
  });

  it('drops level 2 filters whose parent is gone', () => {
    expect(sanitizeState(ITEMS, DEFS, { t: 'magic', wt: 'sword', cl: [1, 2] })).toEqual({});
  });

  it('clamps ranges to the bounds and drops those that do not narrow them', () => {
    expect(sanitizeState(ITEMS, DEFS, { dmg: [0, 7] })).toEqual({ dmg: [3, 7] });
    expect(sanitizeState(ITEMS, DEFS, { dmg: [3, 9] })).toEqual({});
    expect(sanitizeState(ITEMS, DEFS, { dmg: [0, 100] })).toEqual({});
    expect(sanitizeState(ITEMS, DEFS, { dmg: [50, 60] })).toEqual({});
    expect(sanitizeState(ITEMS, DEFS, { dmg: 'x' as never })).toEqual({});
  });

  it('drops a range with no data and a dependent range without its effect', () => {
    expect(sanitizeState(ITEMS, [{ ...DAMAGE, field: 'stats.area' }], { dmg: [1, 2] })).toEqual({});
    expect(sanitizeState(ITEMS, DEFS, { fxv: [1, 5] })).toEqual({});
    expect(
      sanitizeState(ITEMS, [EFFECT, EFFECT_STRENGTH], { fx: ['movement-speed'], fxv: [10, 20] }),
    ).toEqual({
      fx: ['movement-speed'],
      fxv: [10, 20],
    });
  });

  it('drops false toggles, empty text and empty lists', () => {
    expect(
      sanitizeState(ITEMS, [UNIQUE, TEXT, PROPS, UNOBTAINABLE], {
        u: false as never,
        q: '',
        p: [],
      }),
    ).toEqual({});
  });

  it('keeps a toggle that is on', () => {
    expect(sanitizeState(ITEMS, [UNOBTAINABLE], { uo: true })).toEqual({ uo: true });
  });

  it('keeps level 2 types in the data order of the defs', () => {
    expect(
      sanitizeState(ITEMS, [KIND, WEAPON_TYPE, COMBO], { t: 'melee', wt: 'bow', cl: [2, 3] }),
    ).toEqual({
      t: 'melee',
      wt: 'bow',
      cl: [2, 3],
    });
  });
});

describe('patchFor', () => {
  it('sets one param', () => {
    expect(patchFor(DEFS, PROPS, ['a'])).toEqual({ p: ['a'] });
    expect(patchFor(DEFS, WEAPON_TYPE, 'bow')).toEqual({ wt: 'bow' });
    expect(patchFor(DEFS, UNIQUE, null)).toEqual({ u: null });
  });

  it('a level 1 type also clears level 2 types', () => {
    expect(patchFor(DEFS, KIND, 'ranged')).toEqual({ t: 'ranged', wt: null });
  });
});

describe('clearPatch', () => {
  it('nulls every filter param', () => {
    expect(clearPatch([KIND, PROPS])).toEqual({ t: null, p: null });
    expect(clearPatch([])).toEqual({});
  });
});

describe('describeActive', () => {
  it('has one chip per multi value, level 2 type, narrowed range, toggle and query', () => {
    const chips = describeActive(
      ITEMS,
      DEFS,
      { t: 'melee', wt: 'sword', dmg: [4, 8], p: ['a', 'b'], u: true, q: 'sw' },
      label,
    );
    expect(chips.map((c) => c.label)).toEqual([
      'L:sword',
      'Damage 4–8',
      'L:a',
      'L:b',
      'Unique only',
      '“sw”',
    ]);
    expect(new Set(chips.map((c) => c.id)).size).toBe(chips.length);
  });

  it('removing a multi value keeps the rest, or clears the param', () => {
    const [a, b] = describeActive(ITEMS, DEFS, { p: ['a', 'b'] }, label);
    expect(a?.patch).toEqual({ p: ['b'] });
    expect(b?.patch).toEqual({ p: ['a'] });
    const [only] = describeActive(ITEMS, DEFS, { p: ['a'] }, label);
    expect(only?.patch).toEqual({ p: null });
  });

  it('other chips clear their own param', () => {
    const chips = describeActive(
      ITEMS,
      DEFS,
      { t: 'melee', wt: 'sword', dmg: [4, 8], u: true, q: 'x' },
      label,
    );
    expect(chips.map((c) => Object.keys(c.patch)[0])).toEqual(['wt', 'dmg', 'u', 'q']);
    expect(chips.every((c) => Object.values(c.patch)[0] === null)).toBe(true);
  });

  it('adds the unit to range chips when there is one', () => {
    const [chip] = describeActive(ITEMS, [{ ...DAMAGE, unit: '%' }], { dmg: [4, 8] }, label);
    expect(chip?.label).toBe('Damage 4–8%');
    const [plain] = describeActive(ITEMS, [{ ...DAMAGE, unit: undefined }], { dmg: [4, 8] }, label);
    expect(plain?.label).toBe('Damage 4–8');
  });

  it('shows nothing for a level 1 type, full ranges, hidden or empty filters', () => {
    expect(describeActive(ITEMS, DEFS, { t: 'melee' }, label)).toEqual([]);
    expect(
      describeActive(
        ITEMS,
        DEFS,
        { dmg: [3, 9], wt: 'sword', u: false as never, q: '', dmg2: 1 } as never,
        label,
      ),
    ).toEqual([]);
    expect(
      describeActive(ITEMS, [{ ...DAMAGE, field: 'stats.area' }], { dmg: [1, 2] }, label),
    ).toEqual([]);
    expect(describeActive(ITEMS, DEFS, { dmg: 'x' as never }, label)).toEqual([]);
  });
});
