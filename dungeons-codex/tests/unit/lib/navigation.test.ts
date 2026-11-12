import { describe, expect, it } from 'vitest';
import { gameFromPathname, gameSwitchHref, isWithin } from '@/lib/navigation';

describe('gameSwitchHref (GameSwitcher target URL)', () => {
  it('keeps the section when the other game has it', () => {
    expect(gameSwitchHref('/d1/weapons', 'd2')).toBe('/d2/weapons');
    expect(gameSwitchHref('/d2/armor', 'd1')).toBe('/d1/armor');
    expect(gameSwitchHref('/d1/mobs', 'd2')).toBe('/d2/mobs');
  });

  it('goes to the hub when the other game lacks the section', () => {
    expect(gameSwitchHref('/d1/dlcs', 'd2')).toBe('/d2');
    expect(gameSwitchHref('/d1/cosmetics', 'd2')).toBe('/d2');
    expect(gameSwitchHref('/d2/talismans', 'd1')).toBe('/d1');
    expect(gameSwitchHref('/d2/quests', 'd1')).toBe('/d1');
  });

  it('keeps the shared tool pages', () => {
    expect(gameSwitchHref('/d1/compare', 'd2')).toBe('/d2/compare');
    expect(gameSwitchHref('/d2/planner', 'd1')).toBe('/d1/planner');
  });

  it('drops the item slug: detail pages rarely exist in both games', () => {
    expect(gameSwitchHref('/d1/weapons/claymore', 'd2')).toBe('/d2/weapons');
    expect(gameSwitchHref('/d1/dlcs/jungle-awakens', 'd2')).toBe('/d2');
  });

  it('goes to the hub from hubs and neutral pages', () => {
    expect(gameSwitchHref('/d1', 'd2')).toBe('/d2');
    expect(gameSwitchHref('/d2', 'd2')).toBe('/d2');
    expect(gameSwitchHref('/', 'd1')).toBe('/d1');
    expect(gameSwitchHref('/about', 'd2')).toBe('/d2');
    expect(gameSwitchHref('/favorites', 'd1')).toBe('/d1');
    expect(gameSwitchHref('/weapons', 'd2')).toBe('/d2');
  });

  it('tolerates trailing slashes', () => {
    expect(gameSwitchHref('/d1/weapons/', 'd2')).toBe('/d2/weapons');
  });
});

describe('gameFromPathname / isWithin', () => {
  it('reads the game segment', () => {
    expect(gameFromPathname('/d1/weapons')).toBe('d1');
    expect(gameFromPathname('/d2')).toBe('d2');
    expect(gameFromPathname('/')).toBeUndefined();
    expect(gameFromPathname('/about')).toBeUndefined();
    expect(gameFromPathname('/d3/weapons')).toBeUndefined();
  });

  it('matches a path or anything below it, not a longer sibling', () => {
    expect(isWithin('/d1/weapons', '/d1/weapons')).toBe(true);
    expect(isWithin('/d1/weapons/claymore', '/d1/weapons')).toBe(true);
    expect(isWithin('/d1/weapons-extra', '/d1/weapons')).toBe(false);
    expect(isWithin('/d1', '/d1/weapons')).toBe(false);
  });
});
