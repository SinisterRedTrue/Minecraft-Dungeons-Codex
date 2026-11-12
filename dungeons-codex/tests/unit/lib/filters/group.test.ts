import { describe, expect, it } from 'vitest';
import { groupItems } from '@/lib/filters/group';
import { weapon } from './fixtures';

const piece = (name: string, armorSet: string | undefined, slot?: string) =>
  weapon(name, { armorSet, slot });
const RANK = ['helmet', 'chestplate', 'leggings', 'boots'];

describe('groupItems', () => {
  const items = [
    piece('Alpha Boots', 'Alpha', 'boots'),
    piece('Beta Helmet', 'Beta', 'helmet'),
    piece('Alpha Helmet', 'Alpha', 'helmet'),
    piece('Loose', undefined, 'helmet'),
    piece('Alpha Leggings', 'Alpha', 'leggings'),
  ];

  it('groups in order of first appearance and keeps the no-value group last', () => {
    const groups = groupItems(items, 'armorSet');
    expect(groups.map((g) => g.key)).toEqual(['Alpha', 'Beta', '']);
    expect(groups[0]?.items.map((i) => i.name)).toEqual([
      'Alpha Boots',
      'Alpha Helmet',
      'Alpha Leggings',
    ]);
  });

  it('orders members by rank, unknown ranks last', () => {
    const groups = groupItems([...items, piece('Alpha Odd', 'Alpha', 'cape')], 'armorSet', {
      field: 'slot',
      rank: RANK,
    });
    expect(groups[0]?.items.map((i) => i.slot)).toEqual(['helmet', 'leggings', 'boots', 'cape']);
  });

  it('puts the no-value group last even when it appears first', () => {
    const groups = groupItems([piece('Loose', undefined), piece('A', 'Alpha')], 'armorSet');
    expect(groups.map((g) => g.key)).toEqual(['Alpha', '']);
  });

  it('is empty for no items', () => {
    expect(groupItems([], 'armorSet')).toEqual([]);
  });
});
