// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  curvePoints,
  curveTop,
  multiplierAt,
  pickCurve,
  type Curve,
  type ItemCurves,
} from '@/lib/forge/curves';
import { curvesFile } from './real';

const curve = (powers: number[], min: number[], max = min): Curve => ({
  powers,
  min,
  max,
  samples: powers.map(() => 1),
});

describe('curvePoints / curveTop', () => {
  it('turns the parallel arrays into rows once per curve', () => {
    const c = curve([1, 5], [1, 2], [1, 3]);
    expect(curvePoints(c)).toEqual([
      { power: 1, min: 1, max: 1 },
      { power: 5, min: 2, max: 3 },
    ]);
    expect(curvePoints(c)).toBe(curvePoints(c));
  });

  it('knows its highest documented power', () => {
    expect(curveTop(curve([1, 5, 9], [1, 1, 1]))).toBe(9);
    expect(curveTop(undefined)).toBe(0);
  });
});

describe('multiplierAt', () => {
  const c = curve([1, 10, 100], [1, 10, 1000], [1, 20, 2000]);

  it('is exact at documented powers', () => {
    expect(multiplierAt(c, 10)).toEqual({ min: 10, max: 20, extrapolated: false });
  });

  it('is log-linear between points', () => {
    const found = multiplierAt(c, 55);
    // 55 is halfway between 10 and 100.
    expect(found?.min).toBeCloseTo(Math.sqrt(10 * 1000), 8);
    expect(found?.extrapolated).toBe(false);
  });

  it('continues the nearest segment past both ends and says so', () => {
    expect(multiplierAt(c, 190)?.extrapolated).toBe(true);
    expect(multiplierAt(c, 190)?.min).toBeGreaterThan(1000);
    expect(multiplierAt(c, 0)?.extrapolated).toBe(true);
  });

  it('is undefined for a curve with fewer than two points', () => {
    expect(multiplierAt(curve([1], [1]), 5)).toBeUndefined();
  });

  it('reads the real melee curve: 1.0 at power 1 and rising', () => {
    const melee = curvesFile.weapons.melee as Curve;
    expect(multiplierAt(melee, 1)).toEqual({ min: 1, max: 1, extrapolated: false });
    expect((multiplierAt(melee, 100)?.min ?? 0) > 50).toBe(true);
  });
});

describe('pickCurve', () => {
  const type = curve([1, 108], [1, 100]);
  const kind = curve([1, 251], [1, 400]);

  it('prefers the type curve when it reaches the power', () => {
    expect(pickCurve({ type, kind }, 50)).toBe(type);
  });

  it('falls back to the kind curve when only it reaches the power', () => {
    expect(pickCurve({ type, kind }, 200)).toBe(kind);
    expect(pickCurve({ kind }, 50)).toBe(kind);
  });

  it('takes whichever reaches higher when neither reaches the power', () => {
    expect(pickCurve({ type, kind }, 263)).toBe(kind);
    const longType = curve([1, 300], [1, 2]);
    expect(pickCurve({ type: longType, kind }, 400)).toBe(longType);
    expect(pickCurve({ type }, 200)).toBe(type);
  });

  it('is undefined without any curve', () => {
    const none: ItemCurves = {};
    expect(pickCurve(none, 5)).toBeUndefined();
  });
});
