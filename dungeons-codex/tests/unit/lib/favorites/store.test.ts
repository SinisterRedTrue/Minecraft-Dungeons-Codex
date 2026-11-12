import { describe, expect, it } from 'vitest';
import {
  FAVORITES_KEY,
  backupSchema,
  clearFavorites,
  createFavoritesStore,
  importFavorites,
  migrateFavorites,
  toggleFavorite,
} from '@/lib/favorites/store';

describe('migrateFavorites', () => {
  it('keeps valid ids in order and drops duplicates', () => {
    expect(
      migrateFavorites(['d1:weapons:claymore', 'd2:armor:x-y', 'd1:weapons:claymore']),
    ).toEqual(['d1:weapons:claymore', 'd2:armor:x-y']);
  });

  it('drops invalid entries without losing the valid ones', () => {
    expect(migrateFavorites(['d1:weapons:claymore', 7, null, 'nope', 'd3:weapons:a'])).toEqual([
      'd1:weapons:claymore',
    ]);
  });

  it('turns unknown shapes into an empty list', () => {
    expect(migrateFavorites(undefined)).toEqual([]);
    expect(migrateFavorites('d1:weapons:claymore')).toEqual([]);
    expect(migrateFavorites({ nope: true })).toEqual([]);
  });

  it('reads the backup-file shape too', () => {
    expect(migrateFavorites({ version: 1, favorites: ['d1:weapons:claymore'] })).toEqual([
      'd1:weapons:claymore',
    ]);
  });
});

describe('favorites store', () => {
  it('toggles an id on and off and persists it', () => {
    const store = createFavoritesStore();
    expect(toggleFavorite('d1:weapons:claymore', store)).toBe(true);
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')).toEqual([
      'd1:weapons:claymore',
    ]);
    expect(toggleFavorite('d1:weapons:claymore', store)).toBe(false);
    expect(localStorage.getItem(FAVORITES_KEY)).toBeNull();
  });

  it('merges an import into the current list, or replaces it', () => {
    const store = createFavoritesStore();
    toggleFavorite('d1:weapons:a', store);
    importFavorites(['d1:weapons:a', 'd2:weapons:b'], 'merge', store);
    expect(store.getSnapshot()).toEqual(['d1:weapons:a', 'd2:weapons:b']);
    importFavorites(['d2:armor:c'], 'replace', store);
    expect(store.getSnapshot()).toEqual(['d2:armor:c']);
    importFavorites([], 'replace', store);
    expect(store.getSnapshot()).toEqual([]);
  });

  it('clears everything', () => {
    const store = createFavoritesStore();
    toggleFavorite('d1:weapons:a', store);
    clearFavorites(store);
    expect(store.getSnapshot()).toEqual([]);
  });

  it('follows another tab', () => {
    const store = createFavoritesStore();
    store.subscribe(() => {});
    store.getSnapshot();
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(['d1:weapons:z']));
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_KEY }));
    expect(store.getSnapshot()).toEqual(['d1:weapons:z']);
  });
});

describe('backupSchema', () => {
  it('accepts the exported object and a bare list', () => {
    expect(backupSchema.safeParse({ version: 1, favorites: ['d1:weapons:a'] }).success).toBe(true);
    expect(backupSchema.safeParse(['d1:weapons:a']).success).toBe(true);
  });

  it('rejects other versions, bad ids and other shapes', () => {
    expect(backupSchema.safeParse({ version: 2, favorites: [] }).success).toBe(false);
    expect(backupSchema.safeParse({ version: 1, favorites: ['bad id'] }).success).toBe(false);
    expect(backupSchema.safeParse('text').success).toBe(false);
    expect(backupSchema.safeParse({ favorites: [] }).success).toBe(false);
  });
});
