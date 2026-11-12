import { describe, expect, it } from 'vitest';
import { query } from '@/lib/search/engine';
import { fuzzyPrefixMatch, withinOneEdit } from '@/lib/search/fuzzy';
import { normalize, tokenize } from '@/lib/search/normalize';
import { realFlex } from '../../helpers/search';

const d1 = () => [realFlex('d1')];
const both = () => [realFlex('d1'), realFlex('d2')];
const names = (groups: ReturnType<typeof query>) =>
  groups.flatMap((g) => g.hits.map((h) => h.entry.n));

describe('normalize', () => {
  it('lower-cases, drops apostrophes and turns punctuation into spaces', () => {
    expect(normalize("Hunter's Armor")).toBe('hunters armor');
    expect(normalize('Poison-Quill Vine')).toBe('poison quill vine');
    expect(normalize('Axolotl (Leucistic)')).toBe('axolotl leucistic');
    expect(normalize('Café’s  Crème')).toBe('cafes creme');
    expect(normalize('???')).toBe('');
  });
  it('tokenizes into words, and an empty text into none', () => {
    expect(tokenize(' Tower  Avatar (blue) ')).toEqual(['tower', 'avatar', 'blue']);
    expect(tokenize('!!')).toEqual([]);
  });
});

describe('withinOneEdit / fuzzyPrefixMatch', () => {
  it('accepts a substitution, insertion, deletion or neighbour swap, and nothing more', () => {
    expect(withinOneEdit('claymore', 'claymore')).toBe(true);
    expect(withinOneEdit('claymore', 'claymora')).toBe(true);
    expect(withinOneEdit('claymore', 'claymoer')).toBe(true);
    expect(withinOneEdit('claymore', 'clymore')).toBe(true);
    expect(withinOneEdit('clymore', 'claymore')).toBe(true);
    expect(withinOneEdit('claymore', 'claymoree')).toBe(true);
    expect(withinOneEdit('claymore', 'claymxxe')).toBe(false);
    expect(withinOneEdit('claymore', 'clay')).toBe(false);
    expect(withinOneEdit('abcd', 'badc')).toBe(false);
  });
  it('matches a typo in a prefix but not in very short tokens', () => {
    expect(fuzzyPrefixMatch('claymroe', 'claymore')).toBe(true);
    expect(fuzzyPrefixMatch('clymor', 'claymore')).toBe(true);
    expect(fuzzyPrefixMatch('cly', 'clay')).toBe(false);
    expect(fuzzyPrefixMatch('clat', 'clay')).toBe(true); // four letters is long enough to slip
    expect(fuzzyPrefixMatch('xxxx', 'clay')).toBe(false);
  });
});

describe('query ranking on the real Dungeons index', () => {
  it('"clay" finds Claymore first', () => {
    const groups = query('clay', d1());
    expect(groups[0]?.category).toBe('weapons');
    expect(groups[0]?.hits[0]?.entry.n).toBe('Claymore');
  });

  it('"hunters" finds the Hunter\'s … items, not the plain "Hunter" ones', () => {
    const hits = query('hunters', d1(), { total: 100 }).flatMap((g) => g.hits);
    const exact = hits.filter((h) => !h.fuzzy).map((h) => h.entry.n);
    expect(exact).toEqual(expect.arrayContaining(["Hunter's Armor", "Hunter's Promise"]));
    expect(exact.every((n) => n.startsWith("Hunter's"))).toBe(true);
    // Only a handful of exact hits, so the typo pass also offers "Hunter …" names, ranked below.
    const firstFuzzy = hits.findIndex((h) => h.fuzzy);
    expect(hits.slice(0, firstFuzzy).every((h) => h.entry.n.startsWith("Hunter's"))).toBe(true);
  });

  it('a typo still finds Claymore: a missing, swapped and wrong letter', () => {
    for (const typo of ['claymor', 'clymore', 'claymroe', 'claymare']) {
      const first = query(typo, d1())[0]?.hits[0];
      expect(first?.entry.n, typo).toBe('Claymore');
    }
    expect(query('claymroe', d1())[0]?.hits[0]?.fuzzy).toBe(true);
    expect(query('claymor', d1())[0]?.hits[0]?.fuzzy).toBe(false); // a plain prefix, no typo pass
  });

  it('an exact name beats a longer name that merely starts with it', () => {
    expect(query('hunter', both())[0]?.hits[0]?.entry.id).toBe('d2:mobs:hunter');
  });

  it('matches abbreviations from the alias vocabulary', () => {
    expect(query('fw arrow', d1())[0]?.hits[0]?.entry.n).toBe('Fireworks Arrow');
    expect(query('tor', d1())[0]?.hits[0]?.entry.n).toBe('Totem of Regeneration');
    expect(query('hunters hatchet', both())[0]?.hits[0]?.entry.id).toBe(
      'd2:weapons:hunters-hatchet',
    );
  });

  it('matches words in any order and finds entities by tag', () => {
    expect(names(query('armor hunters', d1()))).toContain("Hunter's Armor");
    const byTag = query('knockback', d1());
    expect(byTag.length).toBeGreaterThan(0);
    expect(byTag.flatMap((g) => g.hits).some((h) => h.field === 'tag')).toBe(true);
  });

  it('finds the entity whose name is only punctuation through its slug', () => {
    expect(names(query('secret mission', d1()))).toContain('???');
  });

  it('groups by category with at most 8 per group, best group first', () => {
    const groups = query('a', d1(), { perGroup: 8, total: 100 });
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups) expect(g.hits.length).toBeLessThanOrEqual(8);
    const scores = groups.map((g) => g.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
    for (const g of groups) {
      const hs = g.hits.map((h) => h.score);
      expect(hs).toEqual([...hs].sort((x, y) => y - x));
    }
  });

  it('caps the total, keeps games apart and ignores empty queries', () => {
    const groups = query('a', both(), { total: 20 });
    expect(groups.flatMap((g) => g.hits)).toHaveLength(20);
    const keys = new Set(groups.map((g) => g.key));
    expect(keys.size).toBe(groups.length);
    expect([...keys].some((k) => k.startsWith('d1:'))).toBe(true);
    expect([...keys].some((k) => k.startsWith('d2:'))).toBe(true);
    expect(query('', both())).toEqual([]);
    expect(query('   ', both())).toEqual([]);
    expect(query('!!!', both())).toEqual([]);
  });

  it('finds nothing for gibberish, even with the typo pass', () => {
    expect(query('zqxjkv', both())).toEqual([]);
    expect(query('qqqq zzzz', both())).toEqual([]);
  });

  it('is accent- and case-insensitive', () => {
    expect(query('CLAYMORE', d1())[0]?.hits[0]?.entry.n).toBe('Claymore');
    expect(query('Hünter’s Prömise', d1())[0]?.hits[0]?.entry.n).toBe("Hunter's Promise");
  });

  it('answers a query in well under a frame', () => {
    const flex = both();
    query('warm up', flex);
    const start = performance.now();
    for (let i = 0; i < 20; i++) query('hunters', flex);
    expect((performance.now() - start) / 20).toBeLessThan(25);
  });
});
