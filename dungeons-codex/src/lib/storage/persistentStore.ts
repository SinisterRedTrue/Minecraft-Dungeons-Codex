import { safeStorage } from './safeStorage';

/**
 * A tiny external store backed by `localStorage`, shaped for `useSyncExternalStore`.
 *
 * - **SSR-safe.** The server (and the hydration pass) reads {@link PersistentStore.getServerSnapshot},
 *   the empty value, so the HTML never depends on storage; the real value arrives right after
 *   hydration through the subscription, with no mismatch.
 * - **Stable snapshots.** `getSnapshot` returns the same object until the value really changes
 *   (React would loop on a new object each call).
 * - **Cross-tab.** The `storage` event reloads the value another tab wrote.
 * - **Storage blocked.** The value also lives in memory, so a blocked or full `localStorage`
 *   still works for the current page view; it just is not remembered.
 */
export interface PersistentStore<T> {
  getSnapshot(): T;
  getServerSnapshot(): T;
  subscribe(listener: () => void): () => void;
  /** Replaces the value (memory first, then storage) and notifies subscribers. */
  set(next: T): void;
  /** Re-reads storage (used after a `storage` event and in tests). */
  reload(): void;
}

export interface PersistentStoreOptions<T> {
  key: string;
  /** The value for "nothing stored" and for the server. Must be a stable reference. */
  empty: T;
  /** Turns whatever was stored (parsed JSON, or `undefined`) into a valid value. Never throws. */
  parse(raw: unknown): T;
  /** Value equality, so a no-op write does not notify. Defaults to a JSON comparison. */
  equals?(a: T, b: T): boolean;
}

const jsonEquals = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function createPersistentStore<T>(options: PersistentStoreOptions<T>): PersistentStore<T> {
  const { key, empty, parse } = options;
  const equals = options.equals ?? jsonEquals;
  const listeners = new Set<() => void>();
  let current = empty;
  let loaded = false;
  let listening = false;

  function emit() {
    for (const listener of [...listeners]) listener();
  }

  function read(): T {
    const next = parse(safeStorage.getJSON(key));
    return equals(next, current) ? current : next;
  }

  function ensureLoaded() {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    current = read();
  }

  function onStorage(event: StorageEvent) {
    // `key === null` is `localStorage.clear()` in another tab.
    if (event.key !== null && event.key !== key) return;
    store.reload();
  }

  function attach() {
    if (listening || typeof window === 'undefined') return;
    listening = true;
    window.addEventListener('storage', onStorage);
  }

  function detach() {
    if (!listening || typeof window === 'undefined') return;
    listening = false;
    window.removeEventListener('storage', onStorage);
  }

  const store: PersistentStore<T> = {
    getSnapshot() {
      ensureLoaded();
      return current;
    },
    getServerSnapshot() {
      return empty;
    },
    subscribe(listener) {
      listeners.add(listener);
      attach();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) detach();
      };
    },
    set(next) {
      ensureLoaded();
      if (equals(next, current)) return;
      current = next;
      if (equals(next, empty)) safeStorage.remove(key);
      else safeStorage.setJSON(key, next);
      emit();
    },
    reload() {
      loaded = true;
      const next = read();
      if (next === current) return;
      current = next;
      emit();
    },
  };
  return store;
}
