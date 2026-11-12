import { describe, expect, it } from 'vitest';
import { hashString, seededPick, seededRandom, seededShuffle } from '@/lib/utils/seed';

describe('seed helpers', () => {
  it('hashString is stable and spreads inputs', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('')).toBe(0x811c9dc5);
  });

  it('seededRandom returns the same floats in [0, 1) for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const seq = Array.from({ length: 20 }, () => a());
    expect(seq).toEqual(Array.from({ length: 20 }, () => b()));
    expect(seq.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(new Set(seq).size).toBe(20);
  });

  it('seededShuffle is a deterministic permutation and leaves the input alone', () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    const copy = [...input];
    const one = seededShuffle(input, 'seed');
    expect(input).toEqual(copy);
    expect(seededShuffle(input, 'seed')).toEqual(one);
    expect([...one].sort((x, y) => x - y)).toEqual(input);
    expect(one).not.toEqual(input);
    expect(seededShuffle(input, 'other')).not.toEqual(one);
  });

  it('seededPick takes a prefix of the shuffle and clamps the count', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    expect(seededPick(input, 3, 's')).toEqual(seededShuffle(input, 's').slice(0, 3));
    expect(seededPick(input, 99, 's')).toHaveLength(5);
    expect(seededPick(input, -2, 's')).toEqual([]);
    expect(seededPick([], 3, 's')).toEqual([]);
  });
});
