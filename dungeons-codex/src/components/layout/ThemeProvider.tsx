'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { safeStorage } from '@/lib/storage/safeStorage';
import {
  THEME_KEY,
  isThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme/theme';

type ThemeContextValue = {
  /** What the user picked (system follows the OS). */
  theme: ThemePreference;
  /** What is actually applied to <html data-theme>. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CHANGE_EVENT = 'dc:theme-change';
const LIGHT_QUERY = '(prefers-color-scheme: light)';

// Fallback for when storage is blocked: the toggle still works for this page view.
let memoryPreference: ThemePreference | null = null;

function readPreference(): ThemePreference {
  const stored = safeStorage.get(THEME_KEY);
  if (isThemePreference(stored)) return stored;
  return memoryPreference ?? 'system';
}

function subscribePreference(notify: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === THEME_KEY) notify();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

function subscribeSystem(notify: () => void): () => void {
  const mq = window.matchMedia(LIGHT_QUERY);
  mq.addEventListener('change', notify);
  return () => mq.removeEventListener('change', notify);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribePreference, readPreference, () => 'system' as const);
  const systemLight = useSyncExternalStore(
    subscribeSystem,
    () => window.matchMedia(LIGHT_QUERY).matches,
    () => false,
  );
  const resolvedTheme = resolveTheme(theme, systemLight);

  // The inline <head> script already set this before paint; this keeps it in sync afterwards.
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    // Only remember in memory when the write failed; stored values stay the source of truth.
    memoryPreference = safeStorage.set(THEME_KEY, next) ? null : next;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
