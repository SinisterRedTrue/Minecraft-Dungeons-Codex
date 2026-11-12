import { describe, expect, it } from 'vitest';
import type { CompareRow } from '@/config/categories';
import { bestColumns, cellLines, rowDiffers, rowHasData } from '@/lib/compare/cells';

const row = (over: Partial<CompareRow>): CompareRow => ({
  label: 'Row',
  field: 'f',
  format: 'decimal',
  ...over,
});

describe('bestColumns', () => {
  it('highlights the highest value when higher is better, ties included', () => {
    expect([...bestColumns(row({ better: 'high' }), [3, 11.5, 11.5, 1])]).toEqual([1, 2]);
  });

  it('highlights the lowest value when lower is better (cooldown)', () => {
    expect([
      ...bestColumns(row({ better: 'low', format: 'seconds' }), [20, 8, undefined, 12]),
    ]).toEqual([1]);
  });

  it('highlights nothing without a direction, for text, for one number, or when all are equal', () => {
    expect(bestColumns(row({}), [1, 2]).size).toBe(0);
    expect(bestColumns(row({ better: 'high', format: 'text' }), ['a', 'b']).size).toBe(0);
    expect(bestColumns(row({ better: 'high' }), [5, undefined]).size).toBe(0);
    expect(bestColumns(row({ better: 'high' }), [5, 5, 5]).size).toBe(0);
  });

  it('works with percentages and integers', () => {
    expect([...bestColumns(row({ better: 'high', format: 'percent' }), [10, 25])]).toEqual([1]);
    expect([...bestColumns(row({ better: 'low', format: 'int' }), [4, 2, 9])]).toEqual([1]);
  });
});

describe('rowDiffers / rowHasData', () => {
  it('sees equal and different values, lists and missing data', () => {
    expect(rowDiffers([1, 1, 1])).toBe(false);
    expect(rowDiffers([1, 2])).toBe(true);
    expect(
      rowDiffers([
        ['a', 'b'],
        ['a', 'b'],
      ]),
    ).toBe(false);
    expect(rowDiffers([['a', 'b'], ['a']])).toBe(true);
    expect(rowDiffers([1, undefined])).toBe(true);
    expect(rowDiffers([undefined, undefined])).toBe(false);
    expect(rowDiffers([true, false])).toBe(true);
  });

  it('knows when nobody has data', () => {
    expect(rowHasData([undefined, undefined])).toBe(false);
    expect(rowHasData([undefined, false])).toBe(true);
  });
});

describe('cellLines', () => {
  it('formats a plain value by the row format', () => {
    expect(cellLines(row({ format: 'percent' }), 25)).toEqual(['25%']);
    expect(cellLines(row({ format: 'seconds' }), 8)).toEqual(['8 s']);
    expect(cellLines(row({ format: 'bool' }), false)).toEqual(['No']);
    expect(cellLines(row({ format: 'int' }), 3)).toEqual(['3']);
  });

  it('spells labels, and joins several with a slash', () => {
    expect(cellLines(row({ format: 'label', field: 'weaponType' }), 'dual-wield')).toEqual([
      'Dual Wield',
    ]);
    expect(cellLines(row({ format: 'label', field: 'appliesTo' }), ['melee', 'ranged'])).toEqual([
      'Melee / Ranged',
    ]);
  });

  it('keeps list items as separate lines, and nothing for no data', () => {
    expect(cellLines(row({ format: 'list' }), ['a', 'b'])).toEqual(['a', 'b']);
    expect(cellLines(row({}), undefined)).toBeUndefined();
  });
});
