// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_PICKS, MAX_POWER, decodeForge, encodeForge } from '@/lib/forge/codec';

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('encodeForge / decodeForge', () => {
  it('round-trips power and picks', () => {
    const state = {
      power: 100,
      picks: [
        { slug: 'sharpness', tier: 3 as const },
        { slug: 'smiting', tier: 1 as const },
      ],
    };
    const encoded = encodeForge(state);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeForge(encoded)).toEqual(state);
  });

  it('round-trips without a power (Dungeons II) and with no picks', () => {
    expect(decodeForge(encodeForge({ picks: [{ slug: 'fire-aspect', tier: 2 }] }))).toEqual({
      power: undefined,
      picks: [{ slug: 'fire-aspect', tier: 2 }],
    });
    expect(decodeForge(encodeForge({ power: 1, picks: [] }))).toEqual({ power: 1, picks: [] });
  });

  it('round-trips slugs of every length (all base64 padding cases)', () => {
    for (const slug of ['a', 'ab', 'abc', 'abcd', 'abcde', 'a-very-long-enchantment-slug']) {
      const state = { power: 263, picks: [{ slug, tier: 2 as const }] };
      expect(decodeForge(encodeForge(state))).toEqual(state);
    }
  });

  it('accepts the documented limits', () => {
    const picks = Array.from({ length: MAX_PICKS }, (_, i) => ({
      slug: `e${i}`,
      tier: 1 as const,
    }));
    expect(decodeForge(encodeForge({ power: MAX_POWER, picks }))?.picks).toHaveLength(MAX_PICKS);
  });

  it('keeps links short', () => {
    const picks = [
      { slug: 'environmental-protection', tier: 3 as const },
      { slug: 'thrive-under-pressure', tier: 3 as const },
      { slug: 'luck-of-the-sea', tier: 3 as const },
    ];
    expect(encodeForge({ power: 263, picks }).length).toBeLessThan(200);
  });
});

describe('decodeForge rejects anything that is not a valid link', () => {
  it('returns undefined for missing input', () => {
    expect(decodeForge(undefined)).toBeUndefined();
    expect(decodeForge(null)).toBeUndefined();
    expect(decodeForge('')).toBeUndefined();
  });

  it('returns undefined for text that is not base64 or not JSON', () => {
    expect(decodeForge('!!!not base64!!!')).toBeUndefined();
    expect(decodeForge(Buffer.from('plain words').toString('base64url'))).toBeUndefined();
  });

  it('returns undefined for the wrong shape', () => {
    for (const bad of [
      [],
      'text',
      { e: 'x' },
      {},
      { p: 0, e: [] },
      { p: MAX_POWER + 1, e: [] },
      { p: 1.5, e: [] },
      { e: [['sharpness', 4]] },
      { e: [['sharpness', 0]] },
      { e: [['Not A Slug', 1]] },
      { e: [['sharpness']] },
      {
        e: [
          ['a', 1],
          ['b', 1],
          ['c', 1],
          ['d', 1],
        ],
      },
      { e: [], extra: true },
    ]) {
      expect(decodeForge(b64(bad)), JSON.stringify(bad)).toBeUndefined();
    }
  });
});
