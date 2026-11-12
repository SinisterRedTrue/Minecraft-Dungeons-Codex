import { deflateSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import {
  MAX_URL_LENGTH,
  decodeBuild,
  describeDropped,
  encodeBuild,
  type Known,
} from '@/lib/planner/codec';
import {
  MAX_NAME,
  MAX_NOTES,
  emptyBuild,
  fromWire,
  isEmptyBuild,
  toWire,
  type Build,
} from '@/lib/planner/schema';
import { getSlot, type SlotCategory } from '@/lib/planner/slots';
import { d1, d2 } from './real';

const sample: Build = {
  game: 'd1',
  name: 'Fire build',
  power: 200,
  notes: 'Use the axe.',
  slots: {
    melee: {
      slug: 'axe',
      picks: [
        { slug: 'sharpness', tier: 3 },
        { slug: 'smiting', tier: 1 },
      ],
    },
    armor: { slug: 'battle-robe', picks: [] },
  },
};

const raw = (json: unknown) => 'r' + btoa(JSON.stringify(json));

describe('encodeBuild / decodeBuild', () => {
  it('round-trips a build', () => {
    expect(decodeBuild(encodeBuild(sample), 'd1')).toEqual({ build: sample, dropped: [] });
  });

  it('round-trips names with non-ASCII text', () => {
    const build: Build = { game: 'd1', name: 'Épée ⚔ 剣', slots: {} };
    expect(decodeBuild(encodeBuild(build), 'd1')?.build.name).toBe('Épée ⚔ 剣');
  });

  it('prefixes `r` for raw and `z` for deflated, whichever is shorter', () => {
    expect(encodeBuild(emptyBuild('d1'))[0]).toBe('r');
    const big = encodeBuild({ ...sample, notes: 'x'.repeat(MAX_NOTES) });
    expect(big[0]).toBe('z');
    expect(decodeBuild(big, 'd1')?.build.notes).toHaveLength(MAX_NOTES);
  });

  it('keeps a talisman tier, defaults a missing one and drops the tier of other slots', () => {
    const build: Build = {
      game: 'd2',
      slots: { talisman1: { slug: 'amethyst-lens', picks: [], tier: 3 } },
    };
    expect(decodeBuild(encodeBuild(build), 'd2')?.build).toEqual(build);
    const noTier = encodeBuild({
      game: 'd2',
      slots: { talisman1: { slug: 'amethyst-lens', picks: [] } },
    });
    expect(decodeBuild(noTier, 'd2')?.build.slots.talisman1?.tier).toBe(1);
    const stray = encodeBuild({
      game: 'd2',
      slots: { melee: { slug: 'battlestaff', picks: [], tier: 2 } },
    });
    expect(decodeBuild(stray, 'd2')?.build.slots.melee).toEqual({ slug: 'battlestaff', picks: [] });
  });

  it('ignores the power of a Dungeons II build', () => {
    const code = encodeBuild({ game: 'd2', power: 120, slots: {} });
    expect(decodeBuild(code, 'd2')?.build.power).toBeUndefined();
  });

  it('rejects everything that is not a valid link of this game', () => {
    const good = encodeBuild(sample);
    const bad: (string | null | undefined)[] = [
      undefined,
      null,
      '',
      'r',
      'x' + good.slice(1),
      'r!!!notbase64',
      'z' + 'AAAA',
      'r' + btoa('not json'),
      raw({ v: 2, g: 'd1', s: {} }),
      raw({ v: 1, g: 'd1', s: {}, extra: 1 }),
      raw({ v: 1, g: 'd1', p: 999, s: {} }),
      raw({ v: 1, g: 'd1', s: { melee: ['Not A Slug', []] } }),
      raw({ v: 1, g: 'd1', s: { melee: ['axe', [['a', 4]]] } }),
      'r' + 'A'.repeat(4000),
    ];
    for (const code of bad) expect(decodeBuild(code, 'd1'), String(code)).toBeUndefined();
    expect(decodeBuild(good, 'd2')).toBeUndefined();
  });

  it('rejects a link that inflates to more than the allowed size', () => {
    // 20 000 spaces of JSON padding deflate to a few dozen bytes.
    const json = `{"v":1,"g":"d1","s":{}${' '.repeat(20_000)}}`;
    const code = encodeBuildText(json);
    expect(code.length).toBeLessThan(200);
    expect(decodeBuild(code, 'd1')).toBeUndefined();
  });

  it('rejects a name or notes that are too long, and too many slots', () => {
    const withExtra = (over: Record<string, unknown>) => raw({ v: 1, g: 'd1', s: {}, ...over });
    expect(decodeBuild(withExtra({ n: 'n'.repeat(MAX_NAME + 1) }), 'd1')).toBeUndefined();
    expect(decodeBuild(withExtra({ t: 't'.repeat(MAX_NOTES + 1) }), 'd1')).toBeUndefined();
    const many = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`s${i}`, ['axe', []]]));
    expect(decodeBuild(withExtra({ s: many }), 'd1')).toBeUndefined();
  });
});

describe('dropping what the data does not know', () => {
  const known = d1.known;
  const wireOf = (s: Record<string, unknown>) => raw({ v: 1, g: 'd1', s });

  it('keeps a valid build untouched', () => {
    const decoded = decodeBuild(encodeBuild(sample), 'd1', known);
    expect(decoded?.build).toEqual(sample);
    expect(decoded?.dropped).toEqual([]);
  });

  it('drops unknown slots, items, items that do not fit and enchantments, and reports them', () => {
    const decoded = decodeBuild(
      wireOf({
        helmet: ['axe', []],
        melee: ['gone-sword', [['sharpness', 2]]],
        ranged: ['axe', []],
        armor: [
          'battle-robe',
          [
            ['no-such-enchantment', 1],
            ['sharpness', 2],
            ['acrobat', 1],
          ],
        ],
        artifact1: ['blast-fungus', [['acrobat', 1]]],
      }),
      'd1',
      known,
    );
    expect(decoded?.build.slots).toEqual({
      armor: { slug: 'battle-robe', picks: [{ slug: 'acrobat', tier: 1 }] },
      artifact1: { slug: 'blast-fungus', picks: [] },
    });
    expect(decoded?.dropped).toEqual([
      { what: 'slot', slug: 'helmet', slot: 'helmet' },
      { what: 'item', slug: 'gone-sword', slot: 'Melee' },
      { what: 'item', slug: 'axe', slot: 'Ranged' },
      { what: 'enchantment', slug: 'no-such-enchantment', slot: 'Armor' },
      { what: 'enchantment', slug: 'sharpness', slot: 'Armor' },
    ]);
  });

  it("keeps at most the slot's enchantments and never the same one twice", () => {
    const picks = [
      ['sharpness', 1],
      ['sharpness', 2],
      ['smiting', 1],
    ];
    const melee = decodeBuild(wireOf({ melee: ['axe', picks] }), 'd1', known)?.build.slots.melee;
    expect(melee?.picks.map((p) => p.slug)).toEqual(['sharpness', 'smiting']);
    const one = decodeBuild(
      raw({
        v: 1,
        g: 'd2',
        s: {
          melee: [
            'battlestaff',
            [
              ['crash-landing', 1],
              ['fire-aspect', 2],
            ],
          ],
        },
      }),
      'd2',
      d2.known,
    );
    expect(one?.build.slots.melee?.picks).toEqual([{ slug: 'crash-landing', tier: 1 }]);
  });

  it('checks scope: a melee weapon does not fit the Ranged slot', () => {
    const slot = getSlot('d1', 'ranged');
    if (!slot) throw new Error('slot');
    expect(known.hasItem(slot, 'axe')).toBe(false);
    expect(known.hasItem(slot, 'ancient-bow')).toBe(true);
  });

  it('only checks the structure when no data is given', () => {
    const decoded = decodeBuild(wireOf({ melee: ['whatever', [['whatever', 1]]] }), 'd1');
    expect(decoded?.build.slots.melee?.picks).toHaveLength(1);
    const custom: Known = { hasItem: () => true, enchantment: () => ['melee'] };
    expect(decodeBuild(wireOf({ melee: ['x', [['y', 1]]] }), 'd1', custom)?.dropped).toEqual([]);
  });
});

describe('describeDropped', () => {
  it('names one entry, three entries and more', () => {
    const one = describeDropped([{ what: 'item', slug: 'old-sword', slot: 'Melee' }]);
    expect(one).toBe('One entry in this link no longer exists and was left out: “old-sword”.');
    const many = describeDropped(
      ['a', 'b', 'c', 'd', 'e'].map((slug) => ({ what: 'item' as const, slug, slot: 'Melee' })),
    );
    expect(many).toContain('5 entries');
    expect(many).toContain('“a”, “b”, “c” and 2 more');
    expect(describeDropped([{ what: 'slot', slug: 'cape', slot: 'cape' }])).toContain(
      'slot “cape”',
    );
  });
});

describe('wire form', () => {
  it('omits what is empty and round-trips through fromWire', () => {
    expect(toWire(emptyBuild('d2'))).toEqual({ v: 1, g: 'd2', s: {} });
    expect(
      toWire({
        game: 'd2',
        slots: { talisman1: { slug: 't', picks: [{ slug: 'p', tier: 2 }], tier: 3 } },
      }).s,
    ).toEqual({ talisman1: ['t', [['p', 2]], 3] });
    expect(fromWire(toWire(sample))).toEqual(sample);
    expect(isEmptyBuild(emptyBuild('d1'))).toBe(true);
    expect(isEmptyBuild(sample)).toBe(false);
  });
});

describe('URL length (Plans §07 §5: at most 2,000 characters)', () => {
  type Real = typeof d1;
  const longest = (
    real: Real,
    category: SlotCategory,
    pick: (item: Record<string, unknown>) => boolean = () => true,
  ) =>
    real.data
      .items(category)
      .filter(pick)
      .sort((a, b) => b.slug.length - a.slug.length);
  const picksOf = (real: Real, target: 'melee' | 'ranged' | 'armor', n: number) =>
    real.catalog
      .filter((e) => e.appliesTo.includes(target))
      .sort((a, b) => b.slug.length - a.slug.length)
      .slice(0, n)
      .map((e) => ({ slug: e.slug, tier: 3 as const }));

  function fullBuild(game: 'd1' | 'd2'): Build {
    const real = game === 'd1' ? d1 : d2;
    const n = game === 'd1' ? 3 : 1;
    const slot = (category: SlotCategory, filter?: (i: Record<string, unknown>) => boolean) =>
      (longest(real, category, filter)[0] as { slug: string }).slug;
    const slots: Record<string, Build['slots'][string]> = {
      melee: { slug: slot('weapons', (i) => i.kind === 'melee'), picks: picksOf(real, 'melee', n) },
      ranged: {
        slug: slot('weapons', (i) => i.kind === 'ranged'),
        picks: picksOf(real, 'ranged', n),
      },
    };
    if (game === 'd1') {
      slots.armor = { slug: slot('armor'), picks: picksOf(real, 'armor', n) };
    } else {
      for (const part of ['helmet', 'chestplate', 'leggings', 'boots']) {
        slots[part] = {
          slug: slot('armor', (i) => i.slot === part),
          picks: picksOf(real, 'armor', n),
        };
      }
      longest(real, 'talismans')
        .slice(0, 3)
        .forEach((t, i) => {
          slots[`talisman${i + 1}`] = { slug: t.slug, picks: [], tier: 3 };
        });
    }
    longest(real, 'artifacts')
      .slice(0, 3)
      .forEach((a, i) => {
        slots[`artifact${i + 1}`] = { slug: a.slug, picks: [] };
      });
    return {
      game,
      name: 'N'.repeat(MAX_NAME),
      ...(game === 'd1' ? { power: 263 } : {}),
      notes: 'abcdefghij'.repeat(28).slice(0, MAX_NOTES),
      slots,
    };
  }

  it.each(['d1', 'd2'] as const)('a fully loaded %s build with the longest slugs fits', (game) => {
    const build = fullBuild(game);
    expect(Object.keys(build.slots).length).toBe(game === 'd1' ? 6 : 12);
    const url = `https://dungeons-codex.vercel.app/${game}/planner?b=${encodeBuild(build)}`;
    expect(url.length).toBeLessThanOrEqual(MAX_URL_LENGTH);
    // The link round-trips against the real data.
    const decoded = decodeBuild(encodeBuild(build), game, (game === 'd1' ? d1 : d2).known);
    expect(decoded?.dropped).toEqual([]);
    expect(decoded?.build).toEqual(build);
  });
});

/** A raw-deflate link for arbitrary JSON text (to build oversized payloads). */
function encodeBuildText(json: string): string {
  const bytes = deflateSync(new TextEncoder().encode(json), { level: 9 });
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return 'z' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
