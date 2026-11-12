import { describe, expect, it } from 'vitest';
import { damageAt } from '@/lib/forge/damage';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import { indexPlanner } from '@/lib/planner/data';
import type { Build } from '@/lib/planner/schema';
import { DEFAULT_POWER, formatEffectValue, summarize } from '@/lib/planner/summary';
import type { PlannerFile } from '@/lib/planner/types';
import { d1, d2 } from './real';

const build = (game: 'd1' | 'd2', slots: Build['slots'], over: Partial<Build> = {}): Build => ({
  game,
  slots,
  ...over,
});

describe('formatEffectValue', () => {
  it('always shows the sign and the unit', () => {
    expect(formatEffectValue(30, '%')).toBe('+30%');
    expect(formatEffectValue(-40, '%')).toBe('-40%');
    expect(formatEffectValue(2.5, 's')).toBe('+2.5s');
    expect(formatEffectValue(10, 'flat')).toBe('+10');
    expect(formatEffectValue(3)).toBe('+3');
    expect(formatEffectValue(0.1 + 0.2, '%')).toBe('+0.3%');
  });
});

describe('summarize · Dungeons', () => {
  const real = d1;
  const run = (b: Build) => summarize(b, real.data, real.catalogMap);

  it('an empty build has nothing in it', () => {
    expect(run(build('d1', {}))).toEqual({
      filled: 0,
      points: 0,
      power: DEFAULT_POWER,
      damage: [],
      effects: [],
      notes: [],
      warnings: [],
    });
  });

  it('adds up cumulative enchantment points (tier III = 1 + 2 + 3)', () => {
    const summary = run(
      build('d1', {
        melee: {
          slug: 'axe',
          picks: [
            { slug: 'sharpness', tier: 3 },
            { slug: 'smiting', tier: 1 },
          ],
        },
        armor: { slug: 'battle-robe', picks: [{ slug: 'acrobat', tier: 2 }] },
      }),
    );
    const cost = (slug: string, tier: 1 | 2 | 3) => {
      const steps = real.catalogMap.get(slug)?.pointCost ?? [];
      return steps.slice(0, tier).reduce((a, b) => a + b, 0);
    };
    expect(summary.points).toBe(cost('sharpness', 3) + cost('smiting', 1) + cost('acrobat', 2));
    expect(summary.points).toBeGreaterThan(6);
    expect(summary.filled).toBe(2);
  });

  it('computes the damage at the build power through the Forge math', () => {
    const summary = run(
      build(
        'd1',
        { melee: { slug: 'axe', picks: [{ slug: 'sharpness', tier: 3 }] } },
        { power: 50 },
      ),
    );
    const item = real.data.forgeItem('axe');
    if (!item) throw new Error('axe');
    const base = damageAt(item, 50);
    const line = summary.damage[0];
    expect(summary.power).toBe(50);
    expect(line).toMatchObject({ slotKey: 'melee', label: 'Melee', name: 'Axe' });
    expect(line?.value).toEqual(base);
    // Sharpness III is a bare +33 % damage: folded into the number, once.
    expect(line?.multiplier).toBeCloseTo(1.33, 5);
    expect(line?.min).toBeCloseTo((base?.min ?? 0) * 1.33, 5);
    expect(line?.max).toBeCloseTo((base?.max ?? 0) * 1.33, 5);
  });

  it('lists a melee and a ranged weapon, and flags the approximate ones', () => {
    const summary = run(
      build('d1', {
        melee: { slug: 'axe', picks: [] },
        ranged: { slug: 'ancient-bow', picks: [] },
      }),
    );
    expect(summary.damage.map((d) => d.slotKey)).toEqual(['melee', 'ranged']);
    // Power 100 is inside the documented table of the Axe, so its number is exact.
    expect(summary.damage[0]?.value?.approximate).toBe(false);
    const approximate = run(build('d1', { melee: { slug: 'axe', picks: [] } }, { power: 263 }));
    expect(approximate.damage[0]?.value?.approximate).toBe(true);
  });

  it('keeps a weapon with nothing to calculate from, without numbers', () => {
    const bare = indexPlanner({
      ...real.file,
      curves: undefined,
    } as PlannerFile);
    const summary = summarize(
      build('d1', { melee: { slug: 'axe', picks: [] } }),
      bare,
      real.catalogMap,
    );
    expect(summary.damage).toEqual([{ slotKey: 'melee', label: 'Melee', name: 'Axe' }]);
  });

  it('groups effects with the same label and unit and sums them', () => {
    const summary = run(
      build('d1', {
        armor: { slug: 'battle-robe', picks: [] },
        melee: { slug: 'axe', picks: [{ slug: 'sharpness', tier: 3 }] },
        ranged: { slug: 'ancient-bow', picks: [{ slug: 'power', tier: 1 }] },
      }),
    );
    const byLabel = Object.fromEntries(summary.effects.map((e) => [e.label, e]));
    expect(byLabel['Artifact Cooldown']).toMatchObject({
      value: -40,
      unit: '%',
      sources: ['Battle Robe'],
    });
    expect(byLabel['Melee Damage']?.value).toBe(30);
    // Sharpness III (+33 %) and Power I (+10 %) are both "damage": one combined line.
    const sharp = real.catalogMap.get('sharpness')?.levels[2]?.value ?? 0;
    const power = real.catalogMap.get('power')?.levels[0]?.value ?? 0;
    expect(byLabel.Damage).toMatchObject({ value: sharp + power, unit: '%' });
    expect(byLabel.Damage?.sources.sort()).toEqual(['Power', 'Sharpness']);
    expect(summary.effects.map((e) => e.label)).toEqual(
      [...summary.effects.map((e) => e.label)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('does not list the same source twice when it contributes to one group twice', () => {
    const summary = run(
      build('d1', {
        melee: {
          slug: 'axe',
          picks: [
            { slug: 'sharpness', tier: 1 },
            { slug: 'sharpness', tier: 2 },
          ],
        },
      }),
    );
    expect(summary.effects.find((e) => e.label === 'Damage')?.sources).toEqual(['Sharpness']);
  });

  it('writes an effect with no percentage as a note', () => {
    const summary = run(
      build('d1', { armor: { slug: 'battle-robe', picks: [{ slug: 'accelerate', tier: 1 }] } }),
    );
    expect(summary.notes.length + summary.effects.length).toBeGreaterThan(2);
  });

  it('warns about the same artifact in two slots, and not about different ones', () => {
    const twice = run(
      build('d1', {
        artifact1: { slug: 'blast-fungus', picks: [] },
        artifact2: { slug: 'buzzy-nest', picks: [] },
        artifact3: { slug: 'blast-fungus', picks: [] },
      }),
    );
    expect(twice.warnings).toEqual([
      {
        kind: 'duplicate-artifact',
        slug: 'blast-fungus',
        name: 'Blast Fungus',
        slots: ['Artifact 1', 'Artifact 3'],
      },
    ]);
    const different = run(
      build('d1', {
        artifact1: { slug: 'blast-fungus', picks: [] },
        artifact2: { slug: 'buzzy-nest', picks: [] },
      }),
    );
    expect(different.warnings).toEqual([]);
  });

  it('skips slots whose item is not in the data and picks the catalog does not know', () => {
    const summary = run(
      build('d1', {
        melee: { slug: 'no-such-weapon', picks: [{ slug: 'sharpness', tier: 1 }] },
        armor: { slug: 'battle-robe', picks: [{ slug: 'no-such-enchantment', tier: 1 }] },
      }),
    );
    expect(summary.filled).toBe(1);
    expect(summary.damage).toEqual([]);
    expect(summary.points).toBe(0);
  });
});

describe('summarize · Dungeons II', () => {
  const real = d2;
  const run = (b: Build) => summarize(b, real.data, real.catalogMap);
  const helmet = real.data
    .items('armor')
    .find((i) => i.slot === 'helmet' && real.data.extra('armor', i.slug)?.fx);

  it('lists effects and tiers only: no power, no damage numbers', () => {
    const summary = run(
      build('d2', {
        helmet: { slug: helmet?.slug ?? '', picks: [{ slug: 'ancient-alchemy', tier: 2 }] },
        talisman1: { slug: 'amethyst-lens', picks: [], tier: 3 },
        talisman2: { slug: 'armadillo-amulet', picks: [], tier: 1 },
      }),
    );
    expect(summary.damage).toEqual([]);
    const labels = summary.effects.map((e) => e.label);
    expect(labels).toContain('Ranged damage');
    expect(summary.effects.find((e) => e.label === 'Roll cooldown')).toMatchObject({
      value: -20,
      unit: '%',
    });
    expect(summary.effects.find((e) => e.label === 'Ranged damage')).toMatchObject({
      value: 25,
      unit: '%',
      sources: ['Amethyst Lens'],
    });
    // The helmet's own effect value, and the enchantment's tier text as a note.
    const own = real.data.extra('armor', helmet?.slug ?? '')?.fx?.[0];
    expect(summary.effects.find((e) => e.label === own?.label)?.value).toBe(own?.value);
    expect(summary.notes).toContain('Ancient Alchemy: Grants 45 souls');
  });

  it('defaults a talisman to tier I', () => {
    const summary = run(build('d2', { talisman1: { slug: 'amethyst-lens', picks: [] } }));
    expect(summary.effects.find((e) => e.label === 'Ranged damage')?.value).toBe(10);
  });

  it('warns about a duplicate artifact here too', () => {
    const artifact = real.data.items('artifacts')[0]?.slug ?? '';
    const summary = run(
      build('d2', {
        artifact1: { slug: artifact, picks: [] },
        artifact2: { slug: artifact, picks: [] },
      }),
    );
    expect(summary.warnings).toHaveLength(1);
  });
});

describe('summarize · odd data', () => {
  const plain = (extra: Partial<PlannerFile>): PlannerFile => ({
    v: 1,
    game: 'd2',
    items: {},
    labels: {},
    extras: {},
    ...extra,
  });
  const enchant = (slug: string, levels: ForgeEnchantment['levels']): ForgeEnchantment => ({
    id: `d2:enchantments:${slug}`,
    slug,
    name: slug,
    appliesTo: ['armor'],
    kind: 'effect',
    levels,
  });

  it('copes with text effects, rows without a value, short tier lists and unknown units', () => {
    const talisman = (slug: string, passiveBonus?: string) => ({
      id: `d2:talismans:${slug}`,
      slug,
      game: 'd2' as const,
      category: 'talismans',
      name: slug.toUpperCase(),
      tags: [],
      quality: 'verified' as const,
      ...(passiveBonus === undefined ? {} : { passiveBonus }),
    });
    const data = indexPlanner(
      plain({
        items: {
          armor: [
            {
              id: 'd2:armor:a',
              slug: 'a',
              game: 'd2',
              category: 'armor',
              name: 'A',
              tags: [],
              quality: 'verified',
              effects: ['text only', { label: 'Thing' }],
            },
          ],
          talismans: [
            talisman('t', 'Increases speed'),
            talisman('u', 'Summons a wolf'),
            talisman('v', 'Boosts speed'),
            talisman('w', 'Decreases cooldown'),
            talisman('x', 'Increases damage when healthy'),
            talisman('y'),
            talisman('z', 'Recovers health'),
          ],
        },
        extras: {
          armor: {
            a: {
              fx: [
                { label: 'Spread', value: 5, unit: 'flat' },
                { label: 'Plain', value: 1 },
                { label: 'Plain', value: 2 },
              ],
            },
          },
          talismans: {
            t: { tr: [{ text: '7%', value: 7, unit: '%' }] },
            u: { tr: [{ text: 'N/A' }] },
            v: { tr: [{ text: '2 tiles', value: 2, unit: 'tiles' }] },
            w: { tr: [{ text: '5%', value: 5, unit: '%' }] },
            x: { tr: [{ text: '10% while health is above 95%', value: 10, unit: '%' }] },
            z: { tr: [{ text: '3%', value: 3, unit: '%' }] },
          },
        },
      }),
    );
    const catalog = new Map([
      ['short', enchant('short', [{ text: '5% less', value: 5, unit: '%' }])],
      ['plain', enchant('plain', [{ text: 'Does a thing' }, { text: '+5% x', value: 5 }])],
    ]);
    const picks = (...list: [string, 1 | 2 | 3][]) => list.map(([slug, tier]) => ({ slug, tier }));
    const summary = summarize(
      build('d2', {
        helmet: { slug: 'a', picks: picks(['short', 3], ['plain', 1], ['plain', 2]) },
        talisman1: { slug: 't', picks: [], tier: 1 },
        talisman2: { slug: 'u', picks: [], tier: 1 },
        talisman3: { slug: 'v', picks: [], tier: 1 },
      }),
      data,
      catalog,
    );
    expect(summary.effects.map((e) => `${e.label}|${e.unit}|${e.value}`)).toEqual([
      'Plain|undefined|3',
      'Speed|%|7',
      'Spread|flat|5',
    ]);
    expect(summary.notes).toEqual([
      'A: Thing',
      'plain: Does a thing',
      'plain: +5% x',
      'U: Summons a wolf',
      'V: Boosts speed (2 tiles)',
    ]);
    // The remaining talismans: a lowering verb, a condition, no bonus text at all, a tier II
    // the data does not list, and an unrecognised verb.
    const more = summarize(
      build('d2', {
        talisman1: { slug: 'w', picks: [], tier: 1 },
        talisman2: { slug: 'x', picks: [], tier: 1 },
        talisman3: { slug: 'y', picks: [], tier: 2 },
      }),
      data,
      catalog,
    );
    expect(more.effects).toMatchObject([{ label: 'Cooldown', value: -5, unit: '%' }]);
    expect(more.notes).toEqual([
      'X: Increases damage when healthy (10% while health is above 95%)',
    ]);
    const odd = summarize(
      build('d2', { talisman1: { slug: 'z', picks: [], tier: 1 } }),
      data,
      catalog,
    );
    expect(odd.notes).toEqual(['Z: Recovers health (3%)']);
  });
});
