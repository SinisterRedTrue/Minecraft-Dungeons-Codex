// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildCatalog,
  catalogMap,
  loadCatalog,
  resetCatalogCache,
  type CatalogSource,
} from '@/lib/forge/catalog';
import {
  applyEnchantments,
  classifyEnchantment,
  enchantmentsFor,
  type ForgeEnchantment,
} from '@/lib/forge/enchantments';
import { cumulativeCost, pointsUsed } from '@/lib/forge/points';
import { catalog, catalogBySlug, rawEnchantments } from './real';

const kindOf = (slug: string) => catalogBySlug.get(slug)?.kind;

describe('classifyEnchantment on the real D1 enchantments', () => {
  it('folds in only the bare "+N% damage" ones: Sharpness and Power', () => {
    const damage = catalog.filter((e) => e.kind === 'damage').map((e) => e.slug);
    expect(damage.sort()).toEqual(['power', 'sharpness']);
  });

  it('keeps situational damage out of the main number', () => {
    for (const slug of [
      'smiting', // vs. the Undead
      'illagers-bane', // vs. Illagers
      'committed', // vs. wounded mobs
      'supercharge', // charged shots only
      'unchanting', // enchanted enemies only
      'ambush',
      'cowardice', // while at full health
      'void-strike',
    ]) {
      expect(kindOf(slug), slug).toBe('conditional');
    }
  });

  it('leaves effects without damage as plain effects', () => {
    for (const slug of ['accelerate', 'acrobat', 'swiftfooted', 'rush', 'critical-hit']) {
      expect(kindOf(slug), slug).toBe('effect');
    }
  });

  it('judges by the tier text: a description that only mentions damage changes nothing', () => {
    expect(classifyEnchantment([], undefined)).toBe('effect');
    expect(classifyEnchantment([], 'Deals damage.')).toBe('effect');
    expect(
      classifyEnchantment([{ text: '+30% speed', value: 30, unit: '%' }], 'After damage.'),
    ).toBe('effect');
  });

  it('requires every tier to be a positive percentage', () => {
    const levels = [{ text: '+10% damage', value: 10, unit: '%' }, { text: '+20% damage' }];
    expect(classifyEnchantment(levels, 'More damage.')).toBe('conditional');
    expect(classifyEnchantment([{ text: '+0% damage', value: 0, unit: '%' }], 'More damage.')).toBe(
      'conditional',
    );
    expect(
      classifyEnchantment([{ text: '+10% damage', value: 10, unit: 's' }], 'More damage.'),
    ).toBe('conditional');
  });

  it('turns a plain damage enchantment conditional when its description names a condition', () => {
    const levels = [{ text: '+10% damage', value: 10, unit: '%' }];
    expect(classifyEnchantment(levels, 'More damage.')).toBe('damage');
    expect(classifyEnchantment(levels, 'More damage while crouching.')).toBe('conditional');
    expect(
      classifyEnchantment([{ text: '+10% damage after a roll', value: 10, unit: '%' }], undefined),
    ).toBe('conditional');
  });
});

describe('applyEnchantments', () => {
  const base = { min: 1490, max: 2759 }; // Claymore at power 100

  it('multiplies the main number by Sharpness at its tier', () => {
    const result = applyEnchantments(base, [{ slug: 'sharpness', tier: 3 }], catalogBySlug);
    expect(result.multiplier).toBeCloseTo(1.33, 10);
    expect(result.min).toBeCloseTo(1490 * 1.33, 8);
    expect(result.max).toBeCloseTo(2759 * 1.33, 8);
    expect(result.lines).toEqual([
      {
        slug: 'sharpness',
        name: 'Sharpness',
        tier: 3,
        text: '+33% damage',
        value: 33,
        unit: '%',
        conditional: false,
        applied: true,
      },
    ]);
  });

  it('adds more damage with a higher tier', () => {
    const one = applyEnchantments(base, [{ slug: 'sharpness', tier: 1 }], catalogBySlug);
    const three = applyEnchantments(base, [{ slug: 'sharpness', tier: 3 }], catalogBySlug);
    expect(three.max).toBeGreaterThan(one.max);
    expect(one.max).toBeGreaterThan(base.max);
  });

  it('lists a conditional enchantment without changing the main number', () => {
    const result = applyEnchantments(base, [{ slug: 'smiting', tier: 3 }], catalogBySlug);
    expect(result.min).toBe(base.min);
    expect(result.max).toBe(base.max);
    expect(result.multiplier).toBe(1);
    expect(result.lines[0]).toMatchObject({ slug: 'smiting', conditional: true, applied: false });
  });

  it('shows the tier text of a plain effect and leaves the numbers alone', () => {
    const result = applyEnchantments(base, [{ slug: 'acrobat', tier: 2 }], catalogBySlug);
    expect(result.max).toBe(base.max);
    expect(result.lines[0]).toMatchObject({ conditional: false, applied: false });
    expect(result.lines[0]?.text).toBe(catalogBySlug.get('acrobat')?.levels[1]?.text);
  });

  it('skips unknown slugs and tiers the enchantment does not have', () => {
    const short: ForgeEnchantment = {
      id: 'x',
      slug: 'short',
      name: 'Short',
      appliesTo: ['melee'],
      kind: 'damage',
      levels: [{ text: '+5% damage', value: 5, unit: '%' }],
    };
    const map = new Map([['short', short]]);
    expect(applyEnchantments(base, [{ slug: 'nope', tier: 1 }], map).lines).toEqual([]);
    expect(applyEnchantments(base, [{ slug: 'short', tier: 3 }], map).lines).toEqual([]);
  });

  it('does not apply a damage-kind enchantment whose tier has no number', () => {
    const odd: ForgeEnchantment = {
      id: 'x',
      slug: 'odd',
      name: 'Odd',
      appliesTo: ['melee'],
      kind: 'damage',
      levels: [{ text: 'More damage' }, { text: 'More', value: 5 }, { text: 'Most', value: 9 }],
    };
    const result = applyEnchantments(base, [{ slug: 'odd', tier: 1 }], new Map([['odd', odd]]));
    expect(result.multiplier).toBe(1);
    expect(result.lines[0]?.applied).toBe(false);
  });

  it('stacks damage factors multiplicatively', () => {
    const copy = (slug: string): ForgeEnchantment => ({
      id: slug,
      slug,
      name: slug,
      appliesTo: ['melee'],
      kind: 'damage',
      levels: [{ text: '+10% damage', value: 10, unit: '%' }],
    });
    const map = new Map([copy('a'), copy('b')].map((e) => [e.slug, e]));
    const result = applyEnchantments(
      { min: 100, max: 100 },
      [
        { slug: 'a', tier: 1 },
        { slug: 'b', tier: 1 },
      ],
      map,
    );
    expect(result.multiplier).toBeCloseTo(1.21, 10);
  });
});

describe('enchantmentsFor', () => {
  it('lists the enchantments that fit a kind, sorted by name', () => {
    const ranged = enchantmentsFor(catalog, 'ranged');
    expect(ranged.length).toBeGreaterThan(10);
    expect(ranged.every((e) => e.appliesTo.includes('ranged'))).toBe(true);
    expect(ranged.map((e) => e.slug)).toContain('power');
    expect(ranged.map((e) => e.slug)).not.toContain('sharpness');
    const names = ranged.map((e) => e.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    expect(enchantmentsFor(catalog, 'armor').map((e) => e.slug)).toContain('protection');
  });
});

describe('points', () => {
  it('adds the tier steps up to the tier reached', () => {
    expect(cumulativeCost([1, 2, 3], 1)).toBe(1);
    expect(cumulativeCost([1, 2, 3], 2)).toBe(3);
    expect(cumulativeCost([1, 2, 3], 3)).toBe(6);
    expect(cumulativeCost([2, 3, 4], 3)).toBe(9);
  });

  it('has no cost for an enchantment without documented costs', () => {
    expect(cumulativeCost(undefined, 2)).toBeUndefined();
    expect(cumulativeCost([1, 2], 3)).toBeUndefined();
  });

  it('totals the picks and ignores unknown or unpriced ones', () => {
    const total = pointsUsed(
      [
        { slug: 'sharpness', tier: 2 }, // 1 + 2
        { slug: 'protection', tier: 1 }, // powerful: 2
        { slug: 'does-not-exist', tier: 3 },
        { slug: 'shadow-shot', tier: 1 }, // exclusive, no cost
      ],
      catalogBySlug,
    );
    expect(total).toBe(3 + 2);
    expect(pointsUsed([], catalogBySlug)).toBe(0);
  });
});

describe('buildCatalog', () => {
  const source = (extra: Partial<CatalogSource> = {}): CatalogSource => ({
    id: 'd1:enchantments:x',
    slug: 'x',
    name: 'X',
    appliesTo: ['melee'],
    levels: [{ text: '+10% damage', value: 10, unit: '%' }, { text: 'two' }],
    ...extra,
  });

  it('keeps one compact entry per enchantment, sorted by slug', () => {
    expect(catalog).toHaveLength(rawEnchantments.length);
    const slugs = catalog.map((e) => e.slug);
    expect([...slugs].sort((a, b) => a.localeCompare(b))).toEqual(slugs);
    const sharpness = catalogBySlug.get('sharpness');
    expect(sharpness).toMatchObject({
      name: 'Sharpness',
      appliesTo: ['melee'],
      kind: 'damage',
      pointCost: [1, 2, 3],
      image: '/images/d1/enchantments/sharpness.webp',
    });
    expect(sharpness?.levels[2]).toEqual({ text: '+33% damage', value: 33, unit: '%' });
  });

  it('leaves out an image, point cost and level numbers the enchantment does not have', () => {
    const [entry] = buildCatalog('d1', [source({ pointCost: [1, 2] })]);
    expect(entry).not.toHaveProperty('image');
    expect(entry).not.toHaveProperty('pointCost');
    expect(entry?.levels[1]).toEqual({ text: 'two' });
  });

  it('makes every D2 enchantment a plain effect (no power numbers are documented)', () => {
    expect(buildCatalog('d2', [source()])[0]?.kind).toBe('effect');
    expect(buildCatalog('d1', [source()])[0]?.kind).not.toBe('effect');
  });

  it('indexes a catalog by slug', () => {
    expect(catalogMap(catalog).get('power')?.name).toBe('Power');
  });
});

describe('loadCatalog', () => {
  const ok = (body: unknown) => () =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

  it('fetches once per game and reuses the result', async () => {
    resetCatalogCache();
    let calls = 0;
    const fetchFn = ((url: string) => {
      calls += 1;
      expect(url).toBe('/forge/d1.json');
      return ok(catalog)();
    }) as unknown as typeof fetch;
    const first = await loadCatalog('d1', fetchFn);
    const second = await loadCatalog('d1', fetchFn);
    expect(first).toBe(second);
    expect(calls).toBe(1);
  });

  it('does not cache a failure, so a retry fetches again', async () => {
    resetCatalogCache();
    const bad = (() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve([]),
      } as Response)) as unknown as typeof fetch;
    await expect(loadCatalog('d2', bad)).rejects.toThrow('500');
    await expect(
      loadCatalog('d2', ok([{ slug: 'a' }]) as unknown as typeof fetch),
    ).resolves.toHaveLength(1);
  });

  it('rejects a body that is not a list', async () => {
    resetCatalogCache();
    await expect(loadCatalog('d1', ok({}) as unknown as typeof fetch)).rejects.toThrow(
      'not a list',
    );
  });
});
