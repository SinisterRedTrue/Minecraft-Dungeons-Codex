import { GAME_IDS } from '@/config/games';
import { safeStorage } from '@/lib/storage/safeStorage';
import type { SearchEntry } from './types';

export const RECENT_KEY = 'dc:recent';
export const RECENT_MAX = 8;

/** What is remembered of an opened result: enough to show it without loading the index. */
export type RecentEntry = Pick<SearchEntry, 'id' | 'g' | 'c' | 's' | 'n' | 'r' | 'i'>;

const REQUIRED = ['id', 'g', 'c', 's', 'n'] as const;
const OPTIONAL = ['r', 'i'] as const;
const KEYS: readonly string[] = [...REQUIRED, ...OPTIONAL];

/**
 * An entry with exactly the known keys: strings, and `g` a known game. Plain checks, not Zod:
 * this module is in every page's JS (the search provider reads it).
 */
function isRecentEntry(value: unknown): value is RecentEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    Object.keys(entry).every((key) => KEYS.includes(key)) &&
    REQUIRED.every((key) => typeof entry[key] === 'string') &&
    (GAME_IDS as readonly unknown[]).includes(entry.g) &&
    OPTIONAL.every((key) => entry[key] === undefined || typeof entry[key] === 'string')
  );
}

/** The recently opened results, newest first. Anything unreadable counts as empty. */
export function getRecent(): RecentEntry[] {
  const stored = safeStorage.getJSON(RECENT_KEY);
  return Array.isArray(stored) && stored.every(isRecentEntry) ? stored.slice(0, RECENT_MAX) : [];
}

/** Puts `entry` first (moving it up when already there) and keeps the last {@link RECENT_MAX}. */
export function addRecent(entry: SearchEntry | RecentEntry): RecentEntry[] {
  const { id, g, c, s, n, r, i } = entry;
  const next: RecentEntry[] = [
    { id, g, c, s, n, ...(r ? { r } : {}), ...(i ? { i } : {}) },
    ...getRecent().filter((e) => e.id !== id),
  ].slice(0, RECENT_MAX);
  safeStorage.setJSON(RECENT_KEY, next);
  return next;
}

export function clearRecent(): void {
  safeStorage.remove(RECENT_KEY);
}
