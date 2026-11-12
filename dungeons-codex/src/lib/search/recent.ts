import { z } from 'zod';
import { GAME_IDS } from '@/config/games';
import { safeStorage } from '@/lib/storage/safeStorage';
import type { SearchEntry } from './types';

export const RECENT_KEY = 'dc:recent';
export const RECENT_MAX = 8;

const recentSchema = z.array(
  z.strictObject({
    id: z.string(),
    g: z.enum(GAME_IDS as [string, ...string[]]),
    c: z.string(),
    s: z.string(),
    n: z.string(),
    r: z.string().optional(),
    i: z.string().optional(),
  }),
);

/** What is remembered of an opened result: enough to show it without loading the index. */
export type RecentEntry = Pick<SearchEntry, 'id' | 'g' | 'c' | 's' | 'n' | 'r' | 'i'>;

/** The recently opened results, newest first. Anything unreadable counts as empty. */
export function getRecent(): RecentEntry[] {
  const parsed = recentSchema.safeParse(safeStorage.getJSON(RECENT_KEY));
  return parsed.success ? (parsed.data as RecentEntry[]).slice(0, RECENT_MAX) : [];
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
