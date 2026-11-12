import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_COMPARE,
  MAX_COMPARE,
  addToCompare,
  clearCompare,
  compareKey,
  createCompareStore,
  parseCompare,
  removeFromCompare,
  setCompare,
  startNewCompare,
} from '@/lib/compare/store';

afterEach(() => vi.restoreAllMocks());

describe('parseCompare', () => {
  it('accepts a valid state and caps it at four, without duplicates', () => {
    expect(parseCompare({ category: 'weapons', slugs: ['a', 'b', 'a', 'c', 'd', 'e'] })).toEqual({
      category: 'weapons',
      slugs: ['a', 'b', 'c', 'd'],
    });
  });

  it('turns anything else into the empty state', () => {
    for (const bad of [
      undefined,
      null,
      'x',
      [],
      { category: 'Weapons', slugs: ['a'] },
      { category: 'weapons', slugs: ['Bad Slug'] },
      { category: 'weapons', slugs: [] },
    ]) {
      expect(parseCompare(bad)).toBe(EMPTY_COMPARE);
    }
  });
});

describe('compare store', () => {
  it('adds up to four items of one category and refuses a fifth', () => {
    const store = createCompareStore('d1');
    expect(MAX_COMPARE).toBe(4);
    for (const slug of ['a', 'b', 'c', 'd']) {
      expect(addToCompare(store, 'weapons', slug)).toBe('added');
    }
    expect(addToCompare(store, 'weapons', 'e')).toBe('full');
    expect(store.getSnapshot().slugs).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not add the same item twice', () => {
    const store = createCompareStore('d1');
    addToCompare(store, 'weapons', 'a');
    expect(addToCompare(store, 'weapons', 'a')).toBe('duplicate');
    expect(store.getSnapshot().slugs).toEqual(['a']);
  });

  it('asks before mixing categories, then starts a new comparison on request', () => {
    const store = createCompareStore('d1');
    addToCompare(store, 'weapons', 'a');
    expect(addToCompare(store, 'armor', 'x')).toBe('other-category');
    expect(store.getSnapshot()).toEqual({ category: 'weapons', slugs: ['a'] });
    startNewCompare(store, 'armor', 'x');
    expect(store.getSnapshot()).toEqual({ category: 'armor', slugs: ['x'] });
  });

  it('removes items, and the empty selection forgets its category', () => {
    const store = createCompareStore('d1');
    addToCompare(store, 'weapons', 'a');
    addToCompare(store, 'weapons', 'b');
    removeFromCompare(store, 'a');
    expect(store.getSnapshot().slugs).toEqual(['b']);
    removeFromCompare(store, 'nope');
    removeFromCompare(store, 'b');
    expect(store.getSnapshot()).toBe(EMPTY_COMPARE);
    // After that any category can be started again without a prompt.
    expect(addToCompare(store, 'armor', 'x')).toBe('added');
  });

  it('keeps one selection per game', () => {
    const d1 = createCompareStore('d1');
    const d2 = createCompareStore('d2');
    addToCompare(d1, 'weapons', 'a');
    addToCompare(d2, 'armor', 'x');
    expect(JSON.parse(localStorage.getItem(compareKey('d1')) ?? 'null')).toEqual({
      category: 'weapons',
      slugs: ['a'],
    });
    expect(JSON.parse(localStorage.getItem(compareKey('d2')) ?? 'null')).toEqual({
      category: 'armor',
      slugs: ['x'],
    });
  });

  it('sets and clears the whole selection', () => {
    const store = createCompareStore('d1');
    setCompare(store, 'weapons', ['a', 'b', 'a', 'c', 'd', 'e']);
    expect(store.getSnapshot().slugs).toEqual(['a', 'b', 'c', 'd']);
    setCompare(store, 'weapons', []);
    expect(store.getSnapshot()).toBe(EMPTY_COMPARE);
    addToCompare(store, 'weapons', 'a');
    clearCompare(store);
    expect(store.getSnapshot()).toBe(EMPTY_COMPARE);
    expect(localStorage.getItem(compareKey('d1'))).toBeNull();
  });

  it('follows another tab through the storage event', () => {
    const store = createCompareStore('d1');
    const listener = vi.fn();
    store.subscribe(listener);
    store.getSnapshot();
    localStorage.setItem(compareKey('d1'), JSON.stringify({ category: 'armor', slugs: ['z'] }));
    window.dispatchEvent(new StorageEvent('storage', { key: compareKey('d1') }));
    expect(store.getSnapshot()).toEqual({ category: 'armor', slugs: ['z'] });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('works for this page view when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const store = createCompareStore('d2');
    expect(addToCompare(store, 'weapons', 'a')).toBe('added');
    expect(store.getSnapshot().slugs).toEqual(['a']);
  });
});
