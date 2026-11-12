import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeStorage } from '@/lib/storage/safeStorage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('safeStorage', () => {
  it('round-trips strings and removes keys', () => {
    expect(safeStorage.get('k')).toBeNull();
    expect(safeStorage.set('k', 'v')).toBe(true);
    expect(safeStorage.get('k')).toBe('v');
    expect(safeStorage.remove('k')).toBe(true);
    expect(safeStorage.get('k')).toBeNull();
  });

  it('round-trips JSON and returns undefined for missing or invalid JSON', () => {
    expect(safeStorage.getJSON('j')).toBeUndefined();
    expect(safeStorage.setJSON('j', { a: [1, 2] })).toBe(true);
    expect(safeStorage.getJSON('j')).toEqual({ a: [1, 2] });
    window.localStorage.setItem('bad', '{nope');
    expect(safeStorage.getJSON('bad')).toBeUndefined();
  });

  it('setJSON reports failure for values JSON cannot encode', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeStorage.setJSON('c', circular)).toBe(false);
  });

  it('degrades to null / false when every Storage method throws', () => {
    const denied = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied);

    expect(safeStorage.get('k')).toBeNull();
    expect(safeStorage.set('k', 'v')).toBe(false);
    expect(safeStorage.remove('k')).toBe(false);
    expect(safeStorage.getJSON('k')).toBeUndefined();
    expect(safeStorage.setJSON('k', 1)).toBe(false);
  });

  it('survives window.localStorage itself throwing (blocked site data)', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(safeStorage.get('k')).toBeNull();
    expect(safeStorage.set('k', 'v')).toBe(false);
    expect(safeStorage.remove('k')).toBe(false);
  });

  it('is a no-op without a window (server render)', () => {
    vi.stubGlobal('window', undefined);
    expect(safeStorage.get('k')).toBeNull();
    expect(safeStorage.set('k', 'v')).toBe(false);
    expect(safeStorage.remove('k')).toBe(false);
  });
});
