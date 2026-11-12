// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { interpolate, logLerp, nearestPoint, sample } from '@/lib/forge/interpolate';
import { armor, claymoreTable, weapons } from './real';

describe('logLerp', () => {
  it('interpolates the logarithm linearly', () => {
    expect(logLerp(1, 100, 0.5)).toBeCloseTo(10, 10);
    expect(logLerp(10, 1000, 0.25)).toBeCloseTo(10 ** 1.5, 10);
  });

  it('continues the slope outside 0..1', () => {
    expect(logLerp(1, 10, 2)).toBeCloseTo(100, 10);
    expect(logLerp(1, 10, -1)).toBeCloseTo(0.1, 10);
  });

  it('falls back to a straight line when an end is zero, and never goes below 0', () => {
    expect(logLerp(0, 10, 0.5)).toBe(5);
    expect(logLerp(10, 0, 0.5)).toBe(5);
    expect(logLerp(0, 10, -1)).toBe(0);
  });
});

describe('nearestPoint', () => {
  it('finds the closest row, the lower one on a tie', () => {
    expect(nearestPoint(claymoreTable, 7)?.power).toBe(5);
    expect(nearestPoint(claymoreTable, 8)?.power).toBe(10);
    expect(nearestPoint(claymoreTable, 12.5)?.power).toBe(10);
    expect(nearestPoint(claymoreTable, 500)?.power).toBe(108);
  });

  it('has nothing to find in an empty table', () => {
    expect(nearestPoint([], 5)).toBeUndefined();
  });
});

describe('sample / interpolate with the real Claymore table', () => {
  it('has the documented endpoints on the wiki page', () => {
    expect(claymoreTable[0]).toEqual({ power: 1, min: 18, max: 34 });
    expect(claymoreTable.at(-1)).toEqual({ power: 108, min: 2065, max: 3823 });
  });

  it('reproduces every documented row exactly', () => {
    for (const row of claymoreTable) {
      const found = interpolate(claymoreTable, row.power);
      expect(found).toEqual({ min: row.min, max: row.max, documented: true, outside: false });
    }
  });

  it('interpolates log-linearly between rows', () => {
    // Power 7 lies 40 % of the way from power 5 (23–43) to power 10 (30–56).
    const found = interpolate(claymoreTable, 7);
    expect(found?.documented).toBe(false);
    expect(found?.min).toBeCloseTo(Math.exp(Math.log(23) + (Math.log(30) - Math.log(23)) * 0.4), 9);
    expect(found?.max).toBeCloseTo(Math.exp(Math.log(43) + (Math.log(56) - Math.log(43)) * 0.4), 9);
    expect(found?.min).toBeGreaterThan(23);
    expect(found?.min).toBeLessThan(30);
  });

  it('is monotonic across the whole range', () => {
    let previous = 0;
    for (let power = 1; power <= 108; power += 1) {
      const value = interpolate(claymoreTable, power);
      expect(value?.max ?? 0).toBeGreaterThanOrEqual(previous);
      previous = value?.max ?? 0;
    }
  });

  it('refuses a power outside the rows, but sample continues the slope', () => {
    expect(interpolate(claymoreTable, 109)).toBeUndefined();
    expect(interpolate(claymoreTable, 0)).toBeUndefined();
    const beyond = sample(claymoreTable, 120);
    expect(beyond?.outside).toBe(true);
    expect(beyond?.max).toBeGreaterThan(3823);
    const below = sample(claymoreTable, 0);
    expect(below?.outside).toBe(true);
    expect(below?.max).toBeLessThan(34);
  });

  it('needs at least two rows', () => {
    expect(sample([], 5)).toBeUndefined();
    expect(sample([{ power: 1, min: 1, max: 2 }], 1)).toBeUndefined();
  });

  it('handles a zero minimum (armor health at power 1) with a straight line', () => {
    const table = [
      { power: 1, min: 0, max: 3 },
      { power: 5, min: 13, max: 17 },
    ];
    expect(interpolate(table, 3)?.min).toBe(6.5);
  });
});

describe('the real power tables', () => {
  it('are sorted by power with no duplicates', () => {
    for (const item of [...weapons, ...armor]) {
      const table = item.powerTable ?? [];
      for (let i = 1; i < table.length; i += 1) {
        expect(table[i]?.power, item.slug).toBeGreaterThan(table[i - 1]?.power ?? Infinity);
      }
    }
  });
});
