import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCompare, resetCompareCache } from '@/lib/compare/load';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

beforeEach(() => resetCompareCache());

describe('loadCompare', () => {
  it('fetches the category file once per page view', async () => {
    const fetchFn = vi.fn(async () => ok([{ s: 'a', n: 'A', v: {} }]));
    const a = await loadCompare('d1', 'weapons', fetchFn);
    const b = await loadCompare('d1', 'weapons', fetchFn);
    expect(a).toEqual([{ s: 'a', n: 'A', v: {} }]);
    expect(b).toBe(a);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/compare/d1/weapons.json');
  });

  it('keeps categories apart', async () => {
    const fetchFn = vi.fn(async () => ok([]));
    await loadCompare('d1', 'weapons', fetchFn);
    await loadCompare('d2', 'weapons', fetchFn);
    await loadCompare('d1', 'armor', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('does not cache a failure, so a retry fetches again', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce(ok([]));
    await expect(loadCompare('d1', 'weapons', fetchFn)).rejects.toThrow('503');
    await expect(loadCompare('d1', 'weapons', fetchFn)).resolves.toEqual([]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects a response that is not a list', async () => {
    await expect(loadCompare('d1', 'weapons', async () => ok({ nope: 1 }))).rejects.toThrow(
      'not a list',
    );
  });
});
