import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPersistentStore } from '@/lib/storage/persistentStore';

const KEY = 'dc:test:list';
const EMPTY: readonly string[] = Object.freeze([]);

function make() {
  return createPersistentStore<readonly string[]>({
    key: KEY,
    empty: EMPTY,
    parse: (raw) =>
      Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : EMPTY,
  });
}

/** What another tab does: write storage, then the browser fires `storage` here. */
function otherTabWrites(value: string | null) {
  if (value === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, value);
  window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: value }));
}

afterEach(() => vi.restoreAllMocks());

describe('createPersistentStore', () => {
  it('serves the empty value to the server and before anything is stored', () => {
    const store = make();
    expect(store.getServerSnapshot()).toBe(EMPTY);
    expect(store.getSnapshot()).toBe(EMPTY);
  });

  it('reads what is stored, and returns the same object until it changes', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 'b']));
    const store = make();
    const first = store.getSnapshot();
    expect(first).toEqual(['a', 'b']);
    expect(store.getSnapshot()).toBe(first);
  });

  it('treats corrupt JSON as empty', () => {
    localStorage.setItem(KEY, '{not json');
    expect(make().getSnapshot()).toBe(EMPTY);
  });

  it('persists a change, notifies once and ignores a no-op write', () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(['x']);
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toEqual(['x']);
    expect(listener).toHaveBeenCalledTimes(1);
    store.set(['x']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes the key when the value goes back to empty', () => {
    const store = make();
    store.set(['x']);
    store.set(EMPTY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('stops notifying after unsubscribe', () => {
    const store = make();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.set(['x']);
    expect(listener).not.toHaveBeenCalled();
  });

  it('picks up another tab’s write through the storage event', () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.getSnapshot();
    otherTabWrites(JSON.stringify(['from-tab-2']));
    expect(store.getSnapshot()).toEqual(['from-tab-2']);
    expect(listener).toHaveBeenCalledTimes(1);
    otherTabWrites(null);
    expect(store.getSnapshot()).toBe(EMPTY);
  });

  it('ignores storage events for other keys, and reacts to localStorage.clear()', () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set(['x']);
    listener.mockClear();
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '1' }));
    expect(listener).not.toHaveBeenCalled();
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(store.getSnapshot()).toBe(EMPTY);
  });

  it('keeps working in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const store = make();
    expect(store.getSnapshot()).toBe(EMPTY);
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.set(['kept'])).not.toThrow();
    expect(store.getSnapshot()).toEqual(['kept']);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('removes its window listener with the last subscriber', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const store = make();
    const a = store.subscribe(() => {});
    const b = store.subscribe(() => {});
    expect(add.mock.calls.filter(([type]) => type === 'storage')).toHaveLength(1);
    a();
    expect(remove.mock.calls.filter(([type]) => type === 'storage')).toHaveLength(0);
    b();
    expect(remove.mock.calls.filter(([type]) => type === 'storage')).toHaveLength(1);
  });
});
