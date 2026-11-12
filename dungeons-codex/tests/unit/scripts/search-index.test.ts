// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { aliasesFor, buildSearchIndex, unknownAliasKeys } from '@/lib/search/buildIndex';
import type { IndexableEntity } from '@/lib/search/types';
import { buildAll, MAX_GZIP_BYTES } from '../../../scripts/lib/search-index';
import { readAliases, readEntities, realEntries } from '../helpers/search';

const entity = (
  over: Partial<IndexableEntity> & { slug: string; name: string },
): IndexableEntity => ({
  id: `d1:weapons:${over.slug}`,
  game: 'd1',
  category: 'weapons',
  tags: [],
  ...over,
});

describe('aliasesFor', () => {
  it('adds the name with closed-up hyphens, and none for apostrophes (the normaliser folds them)', () => {
    expect(
      aliasesFor({ category: 'armor', slug: 'hunters-armor', name: "Hunter's Armor" }),
    ).toEqual([]);
    expect(
      aliasesFor({ category: 'enchantments', slug: 'multi-roll', name: 'Multi-Roll' }),
    ).toEqual(['MultiRoll']);
  });

  it('falls back to the slug words for a name with no letters', () => {
    expect(aliasesFor({ category: 'locations', slug: 'secret-mission', name: '???' })).toEqual([
      'secret mission',
    ]);
  });

  it('adds the vocabulary entry for category:slug and drops duplicates of the name', () => {
    const vocab = { 'artifacts:fireworks-arrow': ['fw arrow', 'FW  Arrow', 'fireworks arrow'] };
    expect(
      aliasesFor(
        { category: 'artifacts', slug: 'fireworks-arrow', name: 'Fireworks Arrow' },
        vocab,
      ),
    ).toEqual(['fw arrow']);
    expect(aliasesFor({ category: 'artifacts', slug: 'other', name: 'Other' }, vocab)).toEqual([]);
  });
});

describe('buildSearchIndex', () => {
  it('maps an entity to the short-key entry and omits empty optional fields', () => {
    const [entry, plain] = buildSearchIndex([
      entity({
        slug: 'claymore',
        name: 'Claymore',
        tags: ['heavy-attack'],
        rarity: 'rare',
        image: { src: '/images/d1/weapons/claymore.webp' },
      }),
      entity({ slug: 'plain', name: 'Plain' }),
    ]);
    expect(entry).toEqual({
      id: 'd1:weapons:claymore',
      g: 'd1',
      c: 'weapons',
      s: 'claymore',
      n: 'Claymore',
      a: [],
      t: ['heavy-attack'],
      r: 'rare',
      i: '/images/d1/weapons/claymore.webp',
    });
    expect(plain).not.toHaveProperty('r');
    expect(plain).not.toHaveProperty('i');
  });

  it('reports alias keys that match no entity', () => {
    const all = [{ category: 'weapons' as const, slug: 'claymore' }];
    expect(unknownAliasKeys(all, { 'weapons:claymore': ['x'], 'weapons:gone': ['y'] })).toEqual([
      'weapons:gone',
    ]);
  });
});

describe('the committed alias vocabulary', () => {
  it('names only entities that exist', () => {
    const all = [...readEntities('d1'), ...readEntities('d2')];
    expect(unknownAliasKeys(all, readAliases())).toEqual([]);
  });
});

describe('buildAll (scripts/index.ts)', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function project(files: Record<string, unknown>): string {
    const root = mkdtempSync(path.join(tmpdir(), 'dc-index-'));
    dirs.push(root);
    for (const [rel, value] of Object.entries(files)) {
      const full = path.join(root, rel);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, JSON.stringify(value));
    }
    return root;
  }

  it('writes data/generated/{game}/search-index.json and a copy in public/search', () => {
    const root = project({
      'data/generated/d1/weapons.json': [entity({ slug: 'claymore', name: 'Claymore' })],
      'data/generated/d2/mobs.json': [
        {
          id: 'd2:mobs:creeper',
          game: 'd2',
          category: 'mobs',
          slug: 'creeper',
          name: 'Creeper',
          tags: [],
        },
      ],
      'data/vocab/aliases.json': { 'weapons:claymore': ['big sword'] },
    });
    const built = buildAll(root);
    expect(built.map((b) => [b.game, b.entries])).toEqual([
      ['d1', 1],
      ['d2', 1],
    ]);
    for (const game of ['d1', 'd2']) {
      const a = readFileSync(path.join(root, 'data/generated', game, 'search-index.json'), 'utf8');
      const b = readFileSync(path.join(root, 'public/search', `${game}.json`), 'utf8');
      expect(a).toBe(b);
    }
    const d1 = JSON.parse(readFileSync(path.join(root, 'public/search/d1.json'), 'utf8')) as {
      a: string[];
    }[];
    expect(d1[0]?.a).toEqual(['big sword']);
  });

  it('is deterministic and works with no data at all', () => {
    const root = project({ 'data/generated/d1/weapons.json': [entity({ slug: 'a', name: 'A' })] });
    buildAll(root);
    const first = readFileSync(path.join(root, 'public/search/d1.json'), 'utf8');
    buildAll(root);
    expect(readFileSync(path.join(root, 'public/search/d1.json'), 'utf8')).toBe(first);
    expect(readFileSync(path.join(root, 'public/search/d2.json'), 'utf8')).toBe('[]');
  });

  it('fails on an alias for a missing entity', () => {
    const root = project({
      'data/generated/d1/weapons.json': [entity({ slug: 'a', name: 'A' })],
      'data/vocab/aliases.json': { 'weapons:nope': ['x'] },
    });
    expect(() => buildAll(root)).toThrow(/weapons:nope/);
  });
});

describe('the committed index files', () => {
  it.each(['d1', 'd2'] as const)(
    '%s: fresh, mirrored in public/ and within the size budget',
    (game) => {
      const fresh = JSON.stringify(realEntries(game));
      const generated = readFileSync(
        path.join(process.cwd(), 'data/generated', game, 'search-index.json'),
        'utf8',
      );
      const served = readFileSync(
        path.join(process.cwd(), 'public/search', `${game}.json`),
        'utf8',
      );
      expect(generated).toBe(fresh); // run `npm run data:index` when this fails
      expect(served).toBe(fresh);
      expect(gzipSync(fresh).length).toBeLessThanOrEqual(MAX_GZIP_BYTES);
      expect((JSON.parse(fresh) as unknown[]).length).toBe(readEntities(game).length);
    },
  );
});
