/**
 * localStorage behind try/catch. Storage can be missing (SSR), blocked (private mode, cookie
 * settings) or full, and even reading `window.localStorage` may throw. Every method degrades to
 * a no-op / null instead of crashing a render or an event handler.
 */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const safeStorage = {
  get(key: string): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  /** Returns whether the value was actually stored. */
  set(key: string, value: string): boolean {
    try {
      const s = storage();
      if (!s) return false;
      s.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      const s = storage();
      if (!s) return false;
      s.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  /** Parsed JSON, or `undefined` when the key is absent, unreadable or not valid JSON. Validate the result (Zod) before trusting it. */
  getJSON(key: string): unknown {
    const raw = safeStorage.get(key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      return safeStorage.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};
