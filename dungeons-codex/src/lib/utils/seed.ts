/** Small deterministic helpers: "random" picks that are identical on every build and test run. */

/** FNV-1a, 32 bit. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: a seeded generator returning floats in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffled copy (Fisher-Yates) that depends only on the seed string and the input order. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const random = seededRandom(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** The first `count` items of a seeded shuffle. */
export function seededPick<T>(items: readonly T[], count: number, seed: string): T[] {
  return seededShuffle(items, seed).slice(0, Math.max(0, count));
}
