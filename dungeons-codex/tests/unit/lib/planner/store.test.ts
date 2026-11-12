import { afterEach, describe, expect, it } from 'vitest';
import { decodeBuild, encodeBuild } from '@/lib/planner/codec';
import { emptyBuild, type Build } from '@/lib/planner/schema';
import {
  BUILDS_KEY,
  DEFAULT_BUILD_NAME,
  EMPTY_BUILDS,
  EMPTY_DRAFT,
  MAX_BUILDS,
  addToDraft,
  createBuildsStore,
  createDraftStore,
  deleteBuild,
  draftBuild,
  draftKey,
  parseBuilds,
  parseDraft,
  renameBuild,
  saveBuild,
  setDraft,
} from '@/lib/planner/store';

afterEach(() => window.localStorage.clear());

const sample: Build = {
  game: 'd1',
  name: 'Axe build',
  slots: { melee: { slug: 'axe', picks: [{ slug: 'sharpness', tier: 2 }] } },
};

describe('draft', () => {
  it('parses a valid draft and rejects the rest', () => {
    expect(parseDraft({ code: 'rabc', savedId: 'x' })).toEqual({ code: 'rabc', savedId: 'x' });
    expect(parseDraft({ code: 'rabc' })).toEqual({ code: 'rabc' });
    for (const bad of [
      undefined,
      null,
      'x',
      {},
      { code: 3 },
      { code: '' },
      { code: 'r'.repeat(5000) },
    ]) {
      expect(parseDraft(bad)).toBe(EMPTY_DRAFT);
    }
  });

  it('stores the build as its code and clears the draft for an empty build', () => {
    const store = createDraftStore('d1');
    setDraft(store, sample, 'saved-1');
    expect(window.localStorage.getItem(draftKey('d1'))).toContain('saved-1');
    expect(draftBuild(store.getSnapshot(), 'd1')).toEqual(sample);
    expect(store.getSnapshot().savedId).toBe('saved-1');

    setDraft(store, emptyBuild('d1'));
    expect(store.getSnapshot()).toBe(EMPTY_DRAFT);
    expect(window.localStorage.getItem(draftKey('d1'))).toBeNull();
    // A name alone is still worth keeping.
    setDraft(store, { game: 'd1', name: 'Plan', slots: {} });
    expect(store.getSnapshot().code).not.toBe('');
    setDraft(store, { game: 'd1', notes: 'Plan', slots: {} });
    expect(store.getSnapshot().code).not.toBe('');
  });

  it('reads an empty or foreign draft as an empty build', () => {
    expect(draftBuild(EMPTY_DRAFT, 'd2')).toEqual(emptyBuild('d2'));
    expect(draftBuild({ code: encodeBuild(sample) }, 'd2')).toEqual(emptyBuild('d2'));
  });
});

describe('addToDraft ("Open in Planner")', () => {
  it('puts a weapon in its slot, replacing the item and keeping the enchantments', () => {
    const store = createDraftStore('d1');
    setDraft(store, sample);
    expect(addToDraft(store, 'd1', 'weapons', 'claymore', { kind: 'melee' })).toBe('melee');
    const build = draftBuild(store.getSnapshot(), 'd1');
    expect(build.slots.melee).toEqual({
      slug: 'claymore',
      picks: [{ slug: 'sharpness', tier: 2 }],
    });
    expect(build.name).toBe('Axe build');
  });

  it('fills artifact slots in order and keeps the saved build link', () => {
    const store = createDraftStore('d1');
    setDraft(store, emptyBuild('d1'));
    addToDraft(store, 'd1', 'artifacts', 'blast-fungus', {});
    setDraft(store, draftBuild(store.getSnapshot(), 'd1'), 'keep-me');
    addToDraft(store, 'd1', 'artifacts', 'buzzy-nest', {});
    const build = draftBuild(store.getSnapshot(), 'd1');
    expect(Object.keys(build.slots)).toEqual(['artifact1', 'artifact2']);
    expect(store.getSnapshot().savedId).toBe('keep-me');
  });

  it('keeps the tier of a replaced talisman, and starts from nothing', () => {
    const store = createDraftStore('d2');
    const base: Build = {
      game: 'd2',
      slots: {
        talisman1: { slug: 'a', picks: [], tier: 2 },
        talisman2: { slug: 'b', picks: [], tier: 2 },
        talisman3: { slug: 'c', picks: [], tier: 3 },
      },
    };
    setDraft(store, base);
    addToDraft(store, 'd2', 'talismans', 'amethyst-lens', {});
    expect(draftBuild(store.getSnapshot(), 'd2').slots.talisman3).toEqual({
      slug: 'amethyst-lens',
      picks: [],
      tier: 3,
    });
    const fresh = createDraftStore('d2');
    window.localStorage.clear();
    fresh.reload();
    expect(addToDraft(fresh, 'd2', 'armor', 'alchemist-top-hat', { slot: 'helmet' })).toBe(
      'helmet',
    );
  });

  it('refuses an item that has no slot', () => {
    const store = createDraftStore('d1');
    expect(addToDraft(store, 'd1', 'mobs', 'zombie', {})).toBeUndefined();
    expect(store.getSnapshot()).toBe(EMPTY_DRAFT);
  });
});

describe('My builds', () => {
  const fixed = {
    now: () => new Date('2026-11-12T10:00:00.000Z'),
    newId: (() => {
      let n = 0;
      return () => `id-${(n += 1)}`;
    })(),
  };

  it('saves a build with its name, date and code, and updates it in place', () => {
    const store = createBuildsStore();
    const first = saveBuild(sample, undefined, { ...fixed, store });
    expect(first).toMatchObject({
      ok: true,
      saved: { name: 'Axe build', savedAt: '2026-11-12T10:00:00.000Z' },
    });
    if (!first.ok) throw new Error('save');
    expect(decodeBuild(first.saved.code, 'd1')?.build).toEqual(sample);

    const again = saveBuild({ ...sample, name: 'Renamed' }, first.saved.id, { ...fixed, store });
    expect(again).toMatchObject({ ok: true, saved: { id: first.saved.id, name: 'Renamed' } });
    expect(store.getSnapshot()).toHaveLength(1);
    // An id that is not saved any more adds a new build.
    saveBuild(sample, 'gone', { ...fixed, store });
    expect(store.getSnapshot()).toHaveLength(2);
  });

  it('names an unnamed build "Untitled build"', () => {
    const store = createBuildsStore();
    saveBuild({ game: 'd2', slots: {} }, undefined, { ...fixed, store });
    expect(store.getSnapshot()[0]?.name).toBe(DEFAULT_BUILD_NAME);
  });

  it('holds at most 50 builds', () => {
    const store = createBuildsStore();
    for (let i = 0; i < MAX_BUILDS; i += 1) saveBuild(sample, undefined, { store });
    expect(store.getSnapshot()).toHaveLength(MAX_BUILDS);
    expect(saveBuild(sample, undefined, { store })).toEqual({ ok: false, reason: 'full' });
    // Updating one still works when the list is full.
    const id = store.getSnapshot()[0]?.id;
    expect(saveBuild(sample, id, { store }).ok).toBe(true);
    expect(store.getSnapshot()).toHaveLength(MAX_BUILDS);
  });

  it('renames and deletes', () => {
    const store = createBuildsStore();
    const saved = saveBuild(sample, undefined, { store });
    if (!saved.ok) throw new Error('save');
    renameBuild(saved.saved.id, '  New name  ', store);
    expect(store.getSnapshot()[0]?.name).toBe('New name');
    renameBuild(saved.saved.id, '   ', store);
    expect(store.getSnapshot()[0]?.name).toBe(DEFAULT_BUILD_NAME);
    renameBuild(saved.saved.id, 'x'.repeat(100), store);
    expect(store.getSnapshot()[0]?.name).toHaveLength(40);
    renameBuild('unknown', 'nope', store);
    expect(store.getSnapshot()).toHaveLength(1);
    deleteBuild(saved.saved.id, store);
    expect(store.getSnapshot()).toEqual([]);
    expect(window.localStorage.getItem(BUILDS_KEY)).toBeNull();
  });

  it('parses stored data: invalid and repeated entries are dropped, 50 at most', () => {
    const entry = (id: string) => ({
      id,
      game: 'd1',
      name: id,
      savedAt: '2026-11-12T10:00:00.000Z',
      code: 'rAAAA',
    });
    expect(parseBuilds([entry('a'), entry('a'), { id: 'b' }, entry('c')]).map((b) => b.id)).toEqual(
      ['a', 'c'],
    );
    expect(parseBuilds(Array.from({ length: 60 }, (_, i) => entry(`b${i}`)))).toHaveLength(
      MAX_BUILDS,
    );
    for (const bad of [undefined, 'x', {}, [], [{ id: 1 }]])
      expect(parseBuilds(bad)).toBe(EMPTY_BUILDS);
  });

  it('survives a reload from storage', () => {
    const store = createBuildsStore();
    saveBuild(sample, undefined, { store });
    const reloaded = createBuildsStore();
    expect(reloaded.getSnapshot()).toHaveLength(1);
  });
});
