import { describe, expect, it } from 'vitest';
import {
  SLOTS,
  getSlot,
  isPlannable,
  plannerCategories,
  slotForItem,
  slotsFor,
} from '@/lib/planner/slots';

describe('slot definitions (Plans §07 §5)', () => {
  it('Dungeons: Melee, Ranged, Armor and three Artifacts, three enchantment slots each on gear', () => {
    expect(slotsFor('d1').map((s) => s.key)).toEqual([
      'melee',
      'ranged',
      'armor',
      'artifact1',
      'artifact2',
      'artifact3',
    ]);
    for (const key of ['melee', 'ranged', 'armor']) {
      expect(getSlot('d1', key)?.enchantSlots).toBe(3);
    }
    expect(getSlot('d1', 'artifact1')?.enchantSlots).toBe(0);
  });

  it('Dungeons II: 12 equipment items, one enchantment per gear piece, tiered talismans', () => {
    const slots = slotsFor('d2');
    expect(slots.map((s) => s.key)).toEqual([
      'melee',
      'ranged',
      'helmet',
      'chestplate',
      'leggings',
      'boots',
      'artifact1',
      'artifact2',
      'artifact3',
      'talisman1',
      'talisman2',
      'talisman3',
    ]);
    for (const slot of slots.filter((s) => s.target)) expect(slot.enchantSlots).toBe(1);
    expect(slots.filter((s) => s.tiered).map((s) => s.key)).toEqual([
      'talisman1',
      'talisman2',
      'talisman3',
    ]);
  });

  it('scopes each gear slot to its own items', () => {
    expect(getSlot('d1', 'melee')?.scope).toEqual({ field: 'kind', value: 'melee' });
    expect(getSlot('d2', 'helmet')?.scope).toEqual({ field: 'slot', value: 'helmet' });
    expect(getSlot('d1', 'armor')?.scope).toBeUndefined();
  });

  it('keys are unique per game, and lookups of unknown keys fail', () => {
    for (const game of ['d1', 'd2'] as const) {
      const keys = SLOTS[game].map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
    expect(getSlot('d1', 'helmet')).toBeUndefined();
  });

  it('lists the categories the planner needs and which items can be planned', () => {
    expect(plannerCategories('d1')).toEqual(['weapons', 'armor', 'artifacts']);
    expect(plannerCategories('d2')).toEqual(['weapons', 'armor', 'artifacts', 'talismans']);
    expect(isPlannable('d1', 'weapons')).toBe(true);
    expect(isPlannable('d1', 'talismans')).toBe(false);
    expect(isPlannable('d2', 'mobs')).toBe(false);
  });
});

describe('slotForItem', () => {
  it('sends gear to its own slot', () => {
    expect(slotForItem('d1', 'weapons', { kind: 'ranged' }, new Set())).toBe('ranged');
    expect(slotForItem('d1', 'armor', {}, new Set(['armor']))).toBe('armor');
    expect(slotForItem('d2', 'armor', { slot: 'leggings' }, new Set())).toBe('leggings');
  });

  it('refuses an item with no matching slot', () => {
    expect(slotForItem('d1', 'weapons', {}, new Set())).toBeUndefined();
    expect(slotForItem('d2', 'armor', { slot: 'cape' }, new Set())).toBeUndefined();
    expect(slotForItem('d1', 'mobs', {}, new Set())).toBeUndefined();
  });

  it('puts artifacts and talismans in the first free slot, the last one when all are taken', () => {
    expect(slotForItem('d1', 'artifacts', {}, new Set())).toBe('artifact1');
    expect(slotForItem('d1', 'artifacts', {}, new Set(['artifact1']))).toBe('artifact2');
    expect(
      slotForItem('d2', 'talismans', {}, new Set(['talisman1', 'talisman2', 'talisman3'])),
    ).toBe('talisman3');
  });
});
