/**
 * The planner's two browser stores (both built on `createPersistentStore`, so they are SSR-safe,
 * cross-tab and keep working when storage is blocked):
 *
 *  - the **draft** of each game (`dc:planner-draft:{game}`): the build being edited, as its share
 *    code, plus the id of the saved build it came from; "Open in Planner" writes it;
 *  - **My builds** (`dc:builds:v1`): up to 50 saved builds, each with a name, a date and its code.
 */
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { GAME_IDS, type GameId } from '@/config/games';
import { createPersistentStore, type PersistentStore } from '@/lib/storage/persistentStore';
import { MAX_CODE_LENGTH, decodeBuild, encodeBuild } from './codec';
import { slotForItem, type SlotFields } from './slots';
import { emptyBuild, MAX_NAME, type Build } from './schema';

export const MAX_BUILDS = 50;
export const BUILDS_KEY = 'dc:builds:v1';
export const draftKey = (game: GameId) => `dc:planner-draft:${game}`;

// --- the draft ---

export interface Draft {
  /** The build's share code (`codec.ts`); empty when there is no draft. */
  code: string;
  /** The saved build it was opened from, so Save updates it instead of adding another. */
  savedId?: string;
}

export const EMPTY_DRAFT: Draft = Object.freeze({ code: '' });

const draftSchema = z.object({
  code: z.string().max(MAX_CODE_LENGTH),
  savedId: z.string().max(64).optional(),
});

export function parseDraft(raw: unknown): Draft {
  const parsed = draftSchema.safeParse(raw);
  if (!parsed.success || parsed.data.code === '') return EMPTY_DRAFT;
  return parsed.data.savedId
    ? { code: parsed.data.code, savedId: parsed.data.savedId }
    : { code: parsed.data.code };
}

const sameDraft = (a: Draft, b: Draft) => a.code === b.code && a.savedId === b.savedId;

export function createDraftStore(game: GameId): PersistentStore<Draft> {
  return createPersistentStore<Draft>({
    key: draftKey(game),
    empty: EMPTY_DRAFT,
    parse: parseDraft,
    equals: sameDraft,
  });
}

const drafts = Object.fromEntries(GAME_IDS.map((g) => [g, createDraftStore(g)])) as Record<
  GameId,
  PersistentStore<Draft>
>;

export const draftStore = (game: GameId): PersistentStore<Draft> => drafts[game];

/** Writes a build as the draft (clearing it when the build is empty and unnamed). */
export function setDraft(store: PersistentStore<Draft>, build: Build, savedId?: string): void {
  const empty =
    Object.keys(build.slots).length === 0 &&
    !build.name &&
    !build.notes &&
    build.power === undefined;
  store.set(empty ? EMPTY_DRAFT : { code: encodeBuild(build), ...(savedId ? { savedId } : {}) });
}

/** The build a draft holds (structure only; unknown slugs are dealt with when the data loads). */
export function draftBuild(draft: Draft, game: GameId): Build {
  return decodeBuild(draft.code, game)?.build ?? emptyBuild(game);
}

/**
 * "Open in Planner": puts an item into its slot of the game's draft (gear replaces the item in
 * its slot and keeps the enchantments, artifacts and talismans take the first free slot).
 * Returns the slot key, or `undefined` when the item cannot be planned.
 */
export function addToDraft(
  store: PersistentStore<Draft>,
  game: GameId,
  category: string,
  slug: string,
  fields: SlotFields,
): string | undefined {
  const current = draftBuild(store.getSnapshot(), game);
  const key = slotForItem(game, category, fields, new Set(Object.keys(current.slots)));
  if (!key) return undefined;
  const existing = current.slots[key];
  const next: Build = {
    ...current,
    slots: {
      ...current.slots,
      [key]: {
        slug,
        picks: existing?.picks ?? [],
        ...(existing?.tier ? { tier: existing.tier } : {}),
      },
    },
  };
  setDraft(store, next, store.getSnapshot().savedId);
  return key;
}

// --- My builds ---

export interface SavedBuild {
  id: string;
  game: GameId;
  name: string;
  /** ISO date-time. */
  savedAt: string;
  code: string;
}

const savedSchema = z.object({
  id: z.string().min(1).max(64),
  game: z.enum(GAME_IDS),
  name: z.string().min(1).max(MAX_NAME),
  savedAt: z.iso.datetime(),
  code: z.string().min(2).max(MAX_CODE_LENGTH),
});

export const EMPTY_BUILDS: readonly SavedBuild[] = Object.freeze([]);

/** Whatever is stored → the valid saved builds (invalid entries and duplicates dropped, 50 at most). */
export function parseBuilds(raw: unknown): readonly SavedBuild[] {
  if (!Array.isArray(raw)) return EMPTY_BUILDS;
  const out: SavedBuild[] = [];
  for (const entry of raw) {
    const parsed = savedSchema.safeParse(entry);
    if (parsed.success && !out.some((b) => b.id === parsed.data.id)) out.push(parsed.data);
  }
  return out.length === 0 ? EMPTY_BUILDS : out.slice(0, MAX_BUILDS);
}

export function createBuildsStore(): PersistentStore<readonly SavedBuild[]> {
  return createPersistentStore<readonly SavedBuild[]>({
    key: BUILDS_KEY,
    empty: EMPTY_BUILDS,
    parse: parseBuilds,
  });
}

export const buildsStore: PersistentStore<readonly SavedBuild[]> = createBuildsStore();

export const DEFAULT_BUILD_NAME = 'Untitled build';

export type SaveResult = { ok: true; saved: SavedBuild } | { ok: false; reason: 'full' };

export interface SaveOptions {
  store?: PersistentStore<readonly SavedBuild[]>;
  now?: () => Date;
  newId?: () => string;
}

const randomId = () => globalThis.crypto.randomUUID();

/**
 * Saves a build. With `id` of an existing saved build it is updated in place; otherwise a new
 * one is added (refused when 50 are already saved).
 */
export function saveBuild(build: Build, id?: string, options: SaveOptions = {}): SaveResult {
  const { store = buildsStore, now = () => new Date(), newId = randomId } = options;
  const list = store.getSnapshot();
  const existing = id ? list.find((b) => b.id === id) : undefined;
  if (!existing && list.length >= MAX_BUILDS) return { ok: false, reason: 'full' };
  const saved: SavedBuild = {
    id: existing?.id ?? newId(),
    game: build.game,
    name: build.name || DEFAULT_BUILD_NAME,
    savedAt: now().toISOString(),
    code: encodeBuild(build),
  };
  store.set(existing ? list.map((b) => (b.id === saved.id ? saved : b)) : [...list, saved]);
  return { ok: true, saved };
}

export function renameBuild(
  id: string,
  name: string,
  store: PersistentStore<readonly SavedBuild[]> = buildsStore,
): void {
  const clean = name.trim().slice(0, MAX_NAME) || DEFAULT_BUILD_NAME;
  store.set(store.getSnapshot().map((b) => (b.id === id ? { ...b, name: clean } : b)));
}

export function deleteBuild(
  id: string,
  store: PersistentStore<readonly SavedBuild[]> = buildsStore,
): void {
  store.set(store.getSnapshot().filter((b) => b.id !== id));
}

// --- hooks ---

export function useDraft(game: GameId): Draft {
  const store = draftStore(game);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

export function useSavedBuilds(): readonly SavedBuild[] {
  return useSyncExternalStore(
    buildsStore.subscribe,
    buildsStore.getSnapshot,
    buildsStore.getServerSnapshot,
  );
}
