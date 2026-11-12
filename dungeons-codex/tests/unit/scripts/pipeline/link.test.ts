// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cleanLocation, keyOf, linkGame } from '../../../../scripts/pipeline/link';
import { ensureUniqueSlugs } from '../../../../scripts/pipeline/normalize';
import { emptyFindings, type Ent, type GameData } from '../../../../scripts/pipeline/types';

const ent = (category: string, name: string, extra: Record<string, unknown> = {}): Ent => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { id: `d1:${category}:${slug}`, slug, category, game: 'd1', name, ...extra } as Ent;
};

function world(): GameData {
  return {
    weapons: [
      ent('weapons', 'Heartstealer', {
        _refs: {
          builtIn: ['Leeching', 'Nonexistent Enchant'],
          dlc: 'Hidden Depths',
          locations: [
            'Squid Coast (Only once)',
            'Abyssal Monument Daily Trial',
            'Gilded: Vengeful Mariner',
            'Unobtainable',
            'Mystery Place',
            'Squid Coast',
          ],
        },
      }),
    ],
    armor: [],
    enchantments: [
      ent('enchantments', 'Leeching', { _refs: { builtInto: ['Heartstealer', 'Ghost Item'] } }),
    ],
    artifacts: [],
    dlcs: [
      ent('dlcs', 'Hidden Depths', {
        _refs: { locations: ['Abyssal Monument', 'Atlantis'], mobsAdded: ['Vengeful Mariner'] },
      }),
    ],
    cosmetics: [ent('cosmetics', 'Odd Cape', { dlc: 'no-such-dlc' })],
    mobs: [
      ent('mobs', 'Vengeful Mariner', {
        mobType: 'ancient',
        _refs: { locations: ['Squid Coast'], drops: ['Heartstealer (Daily Trial)', 'Emerald'] },
      }),
    ],
    locations: [
      ent('locations', 'Squid Coast', { locationType: 'mission', _refs: { mobs: [] } }),
      ent('locations', 'Abyssal Monument', { locationType: 'mission', _refs: { mobs: [] } }),
      ent('locations', 'Hidden Cave', {
        locationType: 'secret',
        _refs: {
          mobs: ['Vengeful Mariner', 'Missing Mob'],
          unlock: ['Hidden Cave', 'Squid Coast'],
        },
      }),
    ],
  };
}

describe('names', () => {
  it('compares names by slug, so case and punctuation do not matter', () => {
    expect(keyOf("Fighter's Bindings")).toBe(keyOf('fighters bindings'));
    expect(keyOf('???')).toBe('???');
  });

  it('cleans location lines', () => {
    expect(cleanLocation('Squid Coast (Only once)')).toBe('Squid Coast');
    expect(cleanLocation('Abyssal Monument Daily Trial')).toBe('Abyssal Monument');
    expect(cleanLocation('Windswept Peaks (DLC)')).toBe('Windswept Peaks');
  });
});

describe('linkGame', () => {
  it('resolves item references and leaves honest raw text', () => {
    const data = world();
    const findings = emptyFindings();
    linkGame(data, findings);
    const item = data.weapons![0]!;
    expect(item.builtInEnchantments).toEqual([{ enchantmentId: 'd1:enchantments:leeching' }]);
    expect(item.dlc).toBe('hidden-depths');
    expect(item.locations).toEqual([
      'd1:locations:squid-coast',
      'd1:locations:abyssal-monument',
      'Mystery Place',
    ]);
    expect(findings.unresolved).toEqual([
      { category: 'mobs', value: 'Emerald', usedBy: ['d1:mobs:vengeful-mariner'] },
      { category: 'weapons', value: 'Mystery Place', usedBy: ['d1:weapons:heartstealer'] },
    ]);
    expect(findings.droppedRefs.map((d) => d.message)).toContain(
      'built-in enchantment "Nonexistent Enchant" not found',
    );
  });

  it('links enchantments, DLC missions, mobs added and secret parents', () => {
    const data = world();
    linkGame(data, emptyFindings());
    expect(data.enchantments![0]!.builtInto).toEqual(['d1:weapons:heartstealer']);
    expect(data.dlcs![0]!.locationIds).toEqual(['d1:locations:abyssal-monument']);
    expect(data.mobs![0]!.dlc).toBe('hidden-depths');
    const secret = data.locations!.find((l) => l.slug === 'hidden-cave')!;
    expect(secret.mobIds).toEqual(['d1:mobs:vengeful-mariner']);
    expect(secret.secretOf).toBe('d1:locations:squid-coast');
  });

  it('gives an ancient mob its gilded drops, and cleans qualifiers off drop names', () => {
    const data = world();
    linkGame(data, emptyFindings());
    expect(data.mobs![0]!.drops).toEqual(['d1:weapons:heartstealer', 'Emerald']);
    // The gilded line "Gilded: Vengeful Mariner" adds the same item once (deduplicated).
    expect(data.mobs![0]!.locationIds).toEqual(['d1:locations:squid-coast']);
  });

  it('drops a cosmetic DLC that does not exist and reports it', () => {
    const data = world();
    const findings = emptyFindings();
    linkGame(data, findings);
    expect(data.cosmetics![0]!.dlc).toBeUndefined();
    expect(findings.droppedRefs).toContainEqual({
      category: 'cosmetics',
      entity: 'Odd Cape',
      message: 'DLC "no-such-dlc" not found',
    });
  });

  it('uses redirect aliases and records what it could not find', () => {
    const data = world();
    (data.weapons![0]!._refs as { builtIn: string[] }).builtIn = ['Life Leech'];
    const misses = new Set<string>();
    linkGame(structuredClone(data), emptyFindings(), { misses });
    expect(misses).toContain('Life Leech');

    linkGame(data, emptyFindings(), { aliases: new Map([[keyOf('Life Leech'), 'Leeching']]) });
    expect(data.weapons![0]!.builtInEnchantments).toEqual([
      { enchantmentId: 'd1:enchantments:leeching' },
    ]);
  });

  it('skips entities that were already linked (no _refs)', () => {
    const data = world();
    data.weapons![0]!.locations = ['d1:locations:squid-coast'];
    delete data.weapons![0]!._refs;
    linkGame(data, emptyFindings());
    expect(data.weapons![0]!.locations).toEqual(['d1:locations:squid-coast']);
  });
});

describe('ensureUniqueSlugs', () => {
  it('numbers later duplicates and records the collision', () => {
    const findings = emptyFindings();
    const list = [
      ent('cosmetics', 'Confetti'),
      ent('cosmetics', 'Confetti'),
      ent('cosmetics', 'Poof'),
    ];
    ensureUniqueSlugs('cosmetics', list, findings);
    expect(list.map((e) => e.id)).toEqual([
      'd1:cosmetics:confetti',
      'd1:cosmetics:confetti-2',
      'd1:cosmetics:poof',
    ]);
    expect(findings.collisions).toEqual([
      { category: 'cosmetics', name: 'Confetti', slug: 'confetti-2' },
    ]);
  });
});
