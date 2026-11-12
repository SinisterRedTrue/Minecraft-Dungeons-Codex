import { describe, expect, it } from 'vitest';
import { GAMES, GAME_IDS, allGameCategories } from '@/config/games';
import { SECTIONS, getSection } from '@/config/sections';
import { getByIds, getCounts } from '@/lib/data';
import {
  getCollageIcons,
  getFeaturedUniques,
  getHeroIcons,
  getTileImage,
} from '@/lib/data/showcase';

describe('sections config against the real data', () => {
  it('has a section for every category of both games, and only those', () => {
    for (const game of GAME_IDS) {
      expect(Object.keys(SECTIONS[game]).sort()).toEqual([...GAMES[game].categories].sort());
    }
    expect(allGameCategories()).toHaveLength(16);
    expect(getSection('d1', 'talismans')).toBeUndefined();
  });

  it('every tile icon entity exists and has an image', () => {
    for (const { game, category } of allGameCategories()) {
      const id = getSection(game, category)?.tileEntityId ?? '';
      expect(id.startsWith(`${game}:`), id).toBe(true);
      expect(getByIds([id])[0], `${id} exists`).toBeDefined();
      expect(getTileImage(game, category), `${id} has an image`).toBeDefined();
    }
  });

  it('every section has entries (the hubs show 8 real tiles)', () => {
    for (const game of GAME_IDS) {
      const counts = getCounts(game) as Record<string, number>;
      for (const category of GAMES[game].categories) {
        expect(counts[category], `${game}/${category}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('showcase data', () => {
  it('hero icons: 12 real, distinct items from both games, mostly uniques, stable', () => {
    const icons = getHeroIcons(12);
    expect(icons).toHaveLength(12);
    expect(new Set(icons.map((i) => i.id)).size).toBe(12);
    expect(new Set(icons.map((i) => i.game)).size).toBe(2);
    expect(icons.filter((i) => i.isUnique).length).toBeGreaterThanOrEqual(10);
    expect(getHeroIcons(12)).toEqual(icons);
    expect(getByIds(icons.map((i) => i.id))).toHaveLength(12);
  });

  it('featured: 8 unique weapons/armor per game, stable', () => {
    for (const game of GAME_IDS) {
      const featured = getFeaturedUniques(game, 8);
      expect(featured).toHaveLength(8);
      expect(featured.every((i) => i.game === game && i.isUnique)).toBe(true);
      expect(featured.every((i) => ['weapons', 'armor'].includes(i.category))).toBe(true);
      expect(getFeaturedUniques(game, 8)).toEqual(featured);
    }
  });

  it('collages: 5 distinct icons per game', () => {
    for (const game of GAME_IDS) {
      const icons = getCollageIcons(game);
      expect(icons).toHaveLength(5);
      expect(new Set(icons.map((i) => i.id)).size).toBe(5);
    }
  });
});
