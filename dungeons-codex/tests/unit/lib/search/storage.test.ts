import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFlex, loadIndex, resetSearchCache } from '@/lib/search/loadIndex';
import { addRecent, clearRecent, getRecent, RECENT_KEY, RECENT_MAX } from '@/lib/search/recent';
import type { SearchEntry } from '@/lib/search/types';

const entry = (n: number, extra: Partial<SearchEntry> = {}): SearchEntry => ({
  id: `d1:weapons:w${n}`,
  g: 'd1',
  c: 'weapons',
  s: `w${n}`,
  n: `Weapon ${n}`,
  a: [],
  t: [],
  ...extra,
});

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('loadIndex', () => {
  beforeEach(resetSearchCache);

  it('fetches a game once and reuses the result', async () => {
    const fetchFn = vi.fn(() => json([entry(1)]));
    const a = await loadIndex('d1', fetchFn as unknown as typeof fetch);
    const b = await loadIndex('d1', fetchFn as unknown as typeof fetch);
    expect(a).toBe(b);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/search/d1.json');
  });

  it('shares one request between concurrent callers', async () => {
    const fetchFn = vi.fn(() => json([entry(1)]));
    await Promise.all([
      loadIndex('d2', fetchFn as unknown as typeof fetch),
      loadIndex('d2', fetchFn as unknown as typeof fetch),
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure: the next call tries again', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => json({}, 500))
      .mockImplementationOnce(() => json([entry(1)]));
    await expect(loadIndex('d1', fetchFn as unknown as typeof fetch)).rejects.toThrow(/500/);
    await expect(loadIndex('d1', fetchFn as unknown as typeof fetch)).resolves.toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects a body that is not a list, and a network error', async () => {
    await expect(
      loadIndex('d1', (() => json({ not: 'a list' })) as unknown as typeof fetch),
    ).rejects.toThrow(/not a list/);
    await expect(
      loadIndex('d1', (() => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch),
    ).rejects.toThrow('offline');
  });

  it('builds the FlexSearch index once per game', async () => {
    const fetchFn = vi.fn(() => json([entry(1)]));
    const a = await loadFlex('d1', fetchFn as unknown as typeof fetch);
    const b = await loadFlex('d1', fetchFn as unknown as typeof fetch);
    expect(a).toBe(b);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('recent searches (dc:recent)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts empty and remembers the newest first, without duplicates', () => {
    expect(getRecent()).toEqual([]);
    addRecent(entry(1));
    addRecent(entry(2, { r: 'rare', i: '/images/d1/weapons/w2.webp' }));
    addRecent(entry(1));
    expect(getRecent().map((e) => e.id)).toEqual(['d1:weapons:w1', 'd1:weapons:w2']);
    expect(getRecent()[1]).toEqual({
      id: 'd1:weapons:w2',
      g: 'd1',
      c: 'weapons',
      s: 'w2',
      n: 'Weapon 2',
      r: 'rare',
      i: '/images/d1/weapons/w2.webp',
    });
  });

  it('keeps only the last 8 and does not store aliases or tags', () => {
    for (let n = 1; n <= 12; n++) addRecent(entry(n, { a: ['alias'], t: ['tag'] }));
    const recent = getRecent();
    expect(recent).toHaveLength(RECENT_MAX);
    expect(recent[0]?.id).toBe('d1:weapons:w12');
    expect(recent.at(-1)?.id).toBe('d1:weapons:w5');
    expect(recent[0]).not.toHaveProperty('a');
    expect(recent[0]).not.toHaveProperty('t');
  });

  it('treats damaged storage as empty and recovers on the next add', () => {
    window.localStorage.setItem(RECENT_KEY, '{not json');
    expect(getRecent()).toEqual([]);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([{ id: 1 }]));
    expect(getRecent()).toEqual([]);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([{ ...entry(1), g: 'd9' }]));
    expect(getRecent()).toEqual([]);
    addRecent(entry(3));
    expect(getRecent().map((e) => e.id)).toEqual(['d1:weapons:w3']);
  });

  it('does not throw when storage is blocked, and clears', () => {
    addRecent(entry(1));
    clearRecent();
    expect(getRecent()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => addRecent(entry(2))).not.toThrow();
  });
});
