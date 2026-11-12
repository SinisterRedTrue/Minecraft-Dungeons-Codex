import { describe, expect, it } from 'vitest';
import { pickFeatured, pickHeroIcons, preferUniques, type ShowcaseItem } from '@/lib/showcase';

function item(game: 'd1' | 'd2', n: number, isUnique: boolean): ShowcaseItem {
  return {
    id: `${game}:weapons:w${n}`,
    game,
    category: 'weapons',
    slug: `w${n}`,
    name: `W${n}`,
    isUnique,
    image: { src: `/images/${game}/weapons/w${n}.webp`, width: 64, height: 64, alt: `W${n} icon` },
  };
}

const d1 = Array.from({ length: 20 }, (_, i) => item('d1', i, i % 2 === 0));
const d2 = Array.from({ length: 20 }, (_, i) => item('d2', i, i % 3 === 0));

describe('showcase selection', () => {
  it('preferUniques puts uniques first and keeps everything', () => {
    const out = preferUniques(d1, 'x');
    expect(out).toHaveLength(d1.length);
    const firstNonUnique = out.findIndex((i) => !i.isUnique);
    expect(out.slice(0, firstNonUnique).every((i) => i.isUnique)).toBe(true);
    expect(out.slice(firstNonUnique).every((i) => !i.isUnique)).toBe(true);
  });

  it('pickHeroIcons returns the asked count, from both games, deterministically', () => {
    const a = pickHeroIcons({ d1, d2 }, 12, 'seed');
    expect(a).toHaveLength(12);
    expect(new Set(a.map((i) => i.id)).size).toBe(12);
    expect(new Set(a.map((i) => i.game))).toEqual(new Set(['d1', 'd2']));
    expect(a.filter((i) => i.isUnique).length).toBeGreaterThanOrEqual(9);
    expect(pickHeroIcons({ d1, d2 }, 12, 'seed')).toEqual(a);
    expect(pickHeroIcons({ d1, d2 }, 12, 'other seed')).not.toEqual(a);
  });

  it('pickHeroIcons copes with small or empty pools', () => {
    expect(pickHeroIcons({ d1: [], d2: [] }, 12, 's')).toEqual([]);
    expect(pickHeroIcons({ d1: d1.slice(0, 2), d2: [] }, 12, 's')).toHaveLength(2);
  });

  it('pickFeatured is stable for a seed (the sync date) and varies with it', () => {
    const a = pickFeatured(d1, 8, 'featured:d1:2026-11-12');
    expect(a).toHaveLength(8);
    expect(pickFeatured(d1, 8, 'featured:d1:2026-11-12')).toEqual(a);
    expect(pickFeatured(d1, 8, 'featured:d1:2026-12-01')).not.toEqual(a);
  });
});
