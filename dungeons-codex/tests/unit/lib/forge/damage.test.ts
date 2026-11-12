// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Curve } from '@/lib/forge/curves';
import { damageAt, healthAt, reasonText, type ForgeItem } from '@/lib/forge/damage';
import { armorItem, claymoreTable, curvesFile, weaponItem } from './real';

describe('damageAt: case 1, the item has a table that covers the power', () => {
  const claymore = weaponItem('claymore');

  it('returns every documented Claymore row exactly, and says it is not approximate', () => {
    for (const row of claymoreTable) {
      const value = damageAt(claymore, row.power);
      expect(value).toEqual({
        min: row.min,
        max: row.max,
        approximate: false,
        extrapolated: false,
        interpolated: false,
      });
      expect(value?.reason).toBeUndefined();
    }
  });

  it('interpolates between rows without becoming approximate', () => {
    const value = damageAt(claymore, 100);
    expect(value).toMatchObject({ min: 1490, max: 2759, approximate: false });
    const between = damageAt(claymore, 102);
    expect(between?.approximate).toBe(false);
    expect(between?.interpolated).toBe(true);
    expect(between?.max ?? 0).toBeGreaterThan(2759);
    expect(between?.max ?? 0).toBeLessThan(3383);
  });

  it('reproduces rows of two other items with tables (Daggers up to 248, Double Axe up to 251)', () => {
    for (const slug of ['daggers', 'double-axe']) {
      const item = weaponItem(slug);
      const table = item.powerTable ?? [];
      expect(table.length).toBeGreaterThan(20);
      for (const row of table) {
        expect(damageAt(item, row.power)).toMatchObject({
          min: row.min,
          max: row.max,
          approximate: false,
        });
      }
    }
    expect(damageAt(weaponItem('double-axe'), 251)?.approximate).toBe(false);
  });
});

describe('damageAt: case 2, the power is outside the item table', () => {
  const claymore = weaponItem('claymore');

  it('scales the last documented row along the kind curve and is approximate', () => {
    const value = damageAt(claymore, 200);
    expect(value?.approximate).toBe(true);
    expect(value?.reason).toBe('off-table');
    expect(value?.extrapolated).toBe(false);
    // Anchored on the power-108 row (2065–3823), so it grows from there.
    expect(value?.min ?? 0).toBeGreaterThan(2065);
    expect(value?.max ?? 0).toBeGreaterThan(3823);
    expect(value?.max ?? 0).toBeGreaterThan(value?.min ?? Infinity);
  });

  it('flags a curve that had to be continued (the curves end at 251 for melee weapons)', () => {
    const value = damageAt(claymore, 263);
    expect(value).toMatchObject({ approximate: true, reason: 'off-table', extrapolated: true });
    expect(value?.max ?? 0).toBeGreaterThan(damageAt(claymore, 251)?.max ?? Infinity);
  });

  it('keeps the exact values at the anchor row itself (scaling ratio is 1 there)', () => {
    const curves = weaponItem('claymore').curves;
    const item: ForgeItem = {
      powerTable: [
        { power: 1, min: 10, max: 20 },
        { power: 50, min: 100, max: 200 },
      ],
      curves,
    };
    const value = damageAt(item, 51);
    expect(value?.reason).toBe('off-table');
    expect(value?.min ?? 0).toBeGreaterThan(100);
    expect(value?.min ?? 0).toBeLessThan(120);
  });

  it('works from a one-row table too', () => {
    const item: ForgeItem = {
      powerTable: [{ power: 25, min: 50, max: 100 }],
      curves: weaponItem('claymore').curves,
    };
    expect(damageAt(item, 50)).toMatchObject({ approximate: true, reason: 'off-table' });
    expect(damageAt(item, 10)).toMatchObject({ approximate: true, reason: 'off-table' });
  });
});

describe('damageAt: case 3, no table at all', () => {
  const obsidian = weaponItem('obsidian-claymore');

  it('starts from the damage rating times the baseline, approximate with reason "baseline"', () => {
    const baseline = curvesFile.weapons.baseline.melee;
    expect(obsidian.powerTable).toBeUndefined();
    expect(obsidian.rating).toBe(14);
    const atOne = damageAt(obsidian, 1);
    expect(atOne?.approximate).toBe(true);
    expect(atOne?.reason).toBe('baseline');
    expect(atOne?.min).toBeCloseTo(14 * (baseline?.min ?? 0), 6);
    expect(atOne?.max).toBeCloseTo(14 * (baseline?.max ?? 0), 6);
  });

  it('grows with power along the weapon type curve', () => {
    const low = damageAt(obsidian, 20);
    const high = damageAt(obsidian, 100);
    expect(high?.min ?? 0).toBeGreaterThan((low?.min ?? Infinity) * 10);
  });

  it('is undefined when nothing is known to estimate from', () => {
    const { curves } = obsidian;
    expect(damageAt({ curves }, 10)).toBeUndefined(); // no rating
    expect(damageAt({ rating: 0, curves }, 10)).toBeUndefined();
    expect(damageAt({ rating: 5, curves: { ...curves, baseline: undefined } }, 10)).toBeUndefined();
    expect(damageAt({ rating: 5, curves: {} }, 10)).toBeUndefined(); // no curve either
  });

  it('estimates a ranged weapon from the ranged baseline', () => {
    const trickbow = weaponItem('trickbow');
    expect(trickbow.powerTable).toBeUndefined();
    expect(damageAt(trickbow, 30)).toMatchObject({ approximate: true, reason: 'baseline' });
  });
});

describe('healthAt (armor)', () => {
  const robe = armorItem('battle-robe');

  it('returns documented rows exactly', () => {
    for (const row of robe.powerTable ?? []) {
      expect(healthAt(robe, row.power)).toMatchObject({
        min: row.min,
        max: row.max,
        approximate: false,
      });
    }
  });

  it('scales the last row beyond the table', () => {
    const value = healthAt(robe, 113);
    expect(value).toMatchObject({ approximate: true, reason: 'off-table' });
    expect(value?.max ?? 0).toBeGreaterThan(5921);
  });

  it('uses the median health curve for armor with no table', () => {
    const plain = armorItem('archers-armor');
    expect(plain.powerTable).toBeUndefined();
    const value = healthAt(plain, 50);
    expect(value).toMatchObject({ approximate: true, reason: 'curve' });
    const health = curvesFile.armor.health as Curve;
    expect(value?.min).toBe(health.min[health.powers.indexOf(50)]);
  });

  it('uses the curve itself when the anchor row has no ratio to scale by (value 0)', () => {
    const curve: Curve = {
      powers: [1, 5, 10],
      min: [0, 10, 30],
      max: [3, 20, 40],
      samples: [1, 1, 1],
    };
    const item: ForgeItem = {
      powerTable: [{ power: 1, min: 0, max: 3 }],
      curves: { kind: curve },
    };
    const value = healthAt(item, 5);
    expect(value).toMatchObject({ min: 10, reason: 'off-table', approximate: true });
    expect(value?.max).toBeCloseTo(20, 6); // 3 × 20 ÷ 3 = 20: ratio on the max side
  });

  it('is undefined without a health curve', () => {
    expect(healthAt({ curves: {} }, 10)).toBeUndefined();
  });
});

describe('reasonText', () => {
  it('explains each reason and the extrapolation tail', () => {
    expect(reasonText({ reason: 'off-table', extrapolated: false })).toContain('outside');
    expect(reasonText({ reason: 'curve', extrapolated: false }, 'health')).toContain(
      'median health',
    );
    expect(reasonText({ reason: 'baseline', extrapolated: false })).toContain('damage rating');
    expect(reasonText({ reason: 'baseline', extrapolated: true })).toContain('last slope');
    expect(reasonText({ extrapolated: false })).toBe('');
  });
});

describe('speed', () => {
  it('recomputes damage in well under one frame (16 ms) including the enchantment step', () => {
    const claymore = weaponItem('claymore');
    const started = performance.now();
    for (let i = 0; i < 2000; i += 1) damageAt(claymore, 1 + (i % 263));
    const perCall = (performance.now() - started) / 2000;
    expect(perCall).toBeLessThan(1);
  });
});
