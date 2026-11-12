// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deriveGame } from '../../../../scripts/pipeline/derive';
import { applyQuality } from '../../../../scripts/pipeline/quality';
import type { Ent, GameData } from '../../../../scripts/pipeline/types';

const ent = (category: string, name: string, extra: Record<string, unknown> = {}): Ent => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `d1:${category}:${slug}`,
    slug,
    category,
    game: 'd1',
    name,
    related: [],
    ...extra,
  } as Ent;
};

function world(): GameData {
  return {
    weapons: [
      ent('weapons', 'Claymore', {
        kind: 'melee',
        weaponType: 'claymore',
        locations: ['d1:locations:creeper-woods', 'Some Raw Text'],
        variantIds: ['d1:weapons:heartstealer'],
        builtInEnchantments: [],
        dlc: 'hidden-depths',
      }),
      ent('weapons', 'Heartstealer', {
        kind: 'melee',
        weaponType: 'claymore',
        baseItemId: 'd1:weapons:claymore',
        variantIds: [],
        locations: ['d1:locations:creeper-woods'],
        builtInEnchantments: [{ enchantmentId: 'd1:enchantments:leeching' }],
      }),
      ent('weapons', 'Katana', {
        kind: 'melee',
        weaponType: 'katana',
        variantIds: [],
        locations: [],
        builtInEnchantments: [],
      }),
      ent('weapons', 'Hunting Bow', {
        kind: 'ranged',
        weaponType: 'bow',
        variantIds: [],
        locations: [],
        builtInEnchantments: [],
      }),
    ],
    armor: [
      ent('armor', 'Opulent Armor', {
        armorGroup: 'opulent',
        variantIds: [],
        locations: [],
        builtInEnchantments: [],
      }),
    ],
    enchantments: [
      ent('enchantments', 'Leeching', {
        section: 'standard',
        appliesTo: ['melee'],
        tier: 'common',
        builtInto: [],
      }),
      ent('enchantments', 'Emerald Shield', {
        section: 'exclusive',
        appliesTo: [],
        builtInto: ['d1:armor:opulent-armor', 'd1:weapons:hunting-bow'],
      }),
      ent('enchantments', 'Fuse Shot', {
        section: 'standard',
        appliesTo: ['ranged'],
        tier: 'common',
        builtInto: [],
      }),
    ],
    artifacts: [],
    dlcs: [
      ent('dlcs', 'Hidden Depths', {
        locationIds: ['d1:locations:creeper-woods', 'd1:locations:camp'],
      }),
    ],
    cosmetics: [],
    mobs: [
      ent('mobs', 'Creeper', { mobType: 'common', locationIds: ['d1:locations:creeper-woods'] }),
      ent('mobs', 'Zombie', { mobType: 'common', locationIds: [] }),
    ],
    locations: [
      ent('locations', 'Creeper Woods', {
        locationType: 'mission',
        mobIds: ['d1:mobs:zombie'],
        itemIds: [],
      }),
      ent('locations', 'Camp', { locationType: 'camp', mobIds: [], itemIds: [] }),
    ],
  };
}

describe('deriveGame', () => {
  it('makes builtInto and builtInEnchantments symmetric', () => {
    const data = world();
    deriveGame(data);
    expect(data.enchantments!.find((e) => e.slug === 'leeching')!.builtInto).toEqual([
      'd1:weapons:heartstealer',
    ]);
    const bow = data.weapons!.find((w) => w.slug === 'hunting-bow')!;
    expect(bow.builtInEnchantments).toEqual([{ enchantmentId: 'd1:enchantments:emerald-shield' }]);
  });

  it("sets an exclusive enchantment's appliesTo from the items it is built into", () => {
    const data = world();
    deriveGame(data);
    const shield = data.enchantments!.find((e) => e.slug === 'emerald-shield')!;
    expect(shield.appliesTo).toEqual(['ranged', 'armor']);
    expect(shield.builtInto).toEqual(['d1:armor:opulent-armor', 'd1:weapons:hunting-bow']);
  });

  it('computes itemIds, mob ↔ location links and DLC missions', () => {
    const data = world();
    deriveGame(data);
    const woods = data.locations!.find((l) => l.slug === 'creeper-woods')!;
    expect(woods.itemIds).toEqual(['d1:weapons:claymore', 'd1:weapons:heartstealer']);
    expect(woods.mobIds).toEqual(['d1:mobs:creeper', 'd1:mobs:zombie']);
    expect(data.mobs!.find((m) => m.slug === 'zombie')!.locationIds).toEqual([
      'd1:locations:creeper-woods',
    ]);
    expect(woods.locationType).toBe('dlc-mission');
    expect(woods.dlc).toBe('hidden-depths');
    // Only plain missions turn into DLC missions; the Camp stays the Camp.
    expect(data.locations!.find((l) => l.slug === 'camp')!.locationType).toBe('camp');
  });

  it('counts DLC content from the dlc field', () => {
    const data = world();
    deriveGame(data);
    expect(data.dlcs![0]!.contentCounts).toEqual({
      weapons: 1,
      armor: 0,
      artifacts: 0,
      mobs: 0,
      enchantments: 0,
    });
  });

  it('relates a base item to its variants, then to neighbours of the same group', () => {
    const data = world();
    deriveGame(data);
    expect(data.weapons!.find((w) => w.slug === 'claymore')!.related).toEqual([
      'd1:weapons:heartstealer',
    ]);
    expect(data.weapons!.find((w) => w.slug === 'heartstealer')!.related).toEqual([
      'd1:weapons:claymore',
    ]);
    // Never relates an entity to itself, and a lone group has no neighbours.
    expect(data.weapons!.find((w) => w.slug === 'katana')!.related).toEqual([]);
  });

  it('wraps around so neighbours differ from entity to entity', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const mobs = names.map((n) => ent('mobs', n, { mobType: 'common', locationIds: [] }));
    const data: GameData = { mobs };
    deriveGame(data);
    expect(mobs[0]!.related).toHaveLength(6);
    expect((mobs[0]!.related as string[])[0]).toBe('d1:mobs:b');
    expect((mobs[8]!.related as string[])[0]).toBe('d1:mobs:a');
    expect(mobs[8]!.related).not.toContain('d1:mobs:i');
  });
});

describe('applyQuality', () => {
  it('marks entities partial when a recommended field is missing', () => {
    const complete = ent('weapons', 'Claymore', {
      description: 'x',
      stats: { damage: 1 },
      image: { src: 'x' },
    });
    expect(applyQuality(complete)).toEqual([]);
    expect(complete.quality).toBe('verified');
    const lacking = ent('weapons', 'Katana', { description: 'x' });
    expect(applyQuality(lacking)).toEqual(['stats', 'image']);
    expect(lacking.quality).toBe('partial');
  });
});
