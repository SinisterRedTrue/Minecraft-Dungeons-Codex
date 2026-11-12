// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCurve, buildForgeCurves, median } from '../../../../scripts/pipeline/forge';
import type { Ent } from '../../../../scripts/pipeline/types';

const weapon = (
  slug: string,
  weaponType: string,
  kind: 'melee' | 'ranged',
  powerTable?: { power: number; min: number; max: number }[],
): Ent =>
  ({
    id: `d1:weapons:${slug}`,
    slug,
    category: 'weapons',
    name: slug,
    weaponType,
    kind,
    ...(powerTable ? { powerTable } : {}),
  }) as Ent;

describe('median', () => {
  it('takes the middle value, or the mean of the middle two', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });
});

describe('buildCurve', () => {
  const claymore = [
    { power: 1, min: 18, max: 34 },
    { power: 5, min: 23, max: 43 },
  ];
  const heartstealer = [
    { power: 1, min: 20, max: 40 },
    { power: 5, min: 30, max: 60 },
  ];

  it('normalises to the power-1 row and takes medians per documented power', () => {
    const curve = buildCurve([claymore, heartstealer], true)!;
    expect(curve.powers).toEqual([1, 5]);
    expect(curve.min).toEqual([1, 1.388889]); // 23/18 = 1.2778 and 30/20 = 1.5 → their mean
    expect(curve.max).toEqual([1, 1.382353]); // 43/34 = 1.2647 and 60/40 = 1.5 → their mean
    expect(curve.samples).toEqual([2, 2]);
  });

  it('keeps absolute values for armor health (power 1 adds about 0)', () => {
    const curve = buildCurve(
      [
        [
          { power: 1, min: 0, max: 3 },
          { power: 5, min: 13, max: 17 },
        ],
      ],
      false,
    )!;
    expect(curve).toEqual({ powers: [1, 5], min: [0, 13], max: [3, 17], samples: [1, 1] });
  });

  it('ignores one-row tables and tables with no usable base', () => {
    expect(buildCurve([[{ power: 1, min: 1, max: 2 }]], true)).toBeUndefined();
    expect(
      buildCurve(
        [
          [
            { power: 1, min: 0, max: 0 },
            { power: 5, min: 1, max: 2 },
          ],
        ],
        true,
      ),
    ).toBeUndefined();
  });
});

describe('buildForgeCurves', () => {
  it('builds curves per weapon type and per kind, and lists the items with their own table', () => {
    const table = [
      { power: 1, min: 10, max: 20 },
      { power: 10, min: 20, max: 40 },
    ];
    const curves = buildForgeCurves(
      [
        weapon('claymore', 'claymore', 'melee', table),
        weapon('heartstealer', 'claymore', 'melee', table),
        weapon('hunting-bow', 'bow', 'ranged', table),
        weapon('katana', 'katana', 'melee'), // no table: uses its type or kind curve
      ],
      [
        {
          id: 'd1:armor:champions-armor',
          slug: 'champions-armor',
          category: 'armor',
          name: "Champion's Armor",
          powerTable: [
            { power: 1, min: 0, max: 3 },
            { power: 5, min: 13, max: 17 },
          ],
        } as Ent,
      ],
    );
    expect(Object.keys(curves.weapons.byWeaponType)).toEqual(['bow', 'claymore']);
    expect(curves.weapons.byWeaponType.claymore).toEqual({
      powers: [1, 10],
      min: [1, 2],
      max: [1, 2],
      samples: [2, 2],
    });
    expect(curves.weapons.melee?.samples).toEqual([2, 2]);
    expect(curves.weapons.ranged?.samples).toEqual([1, 1]);
    expect(curves.armor.health?.min).toEqual([0, 13]);
    expect(curves.itemsWithOwnTable).toEqual({
      weapons: ['d1:weapons:claymore', 'd1:weapons:heartstealer', 'd1:weapons:hunting-bow'],
      armor: ['d1:armor:champions-armor'],
    });
  });
});
