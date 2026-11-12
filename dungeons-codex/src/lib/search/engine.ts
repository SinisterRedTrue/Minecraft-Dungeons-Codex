import { Document } from 'flexsearch';
import { fuzzyPrefixMatch } from './fuzzy';
import { normalize } from './normalize';
import type { MatchField, SearchEntry, SearchGroup, SearchHit } from './types';

/**
 * Ranking weight of a match in each field, the Plans §07 boosts (name 3, aliases 2, tags 1)
 * expressed as a share of the match quality. FlexSearch 0.8 has no per-field boost, so the
 * scorer applies them; FlexSearch only finds the candidates.
 */
const FIELD_WEIGHT: Record<MatchField, number> = { name: 1, alias: 0.9, tag: 0.4 };
const FIELD_OF: Record<string, MatchField> = { n: 'name', a: 'alias', t: 'tag' };

/** Below this many exact hits the edit-distance pass also runs. */
const TYPO_PASS_BELOW = 3;
/** Fuzzy hits rank under every real hit. */
const FUZZY_SCORE = 12;

interface Prepared {
  entry: SearchEntry;
  name: string;
  aliases: string[];
  tags: string[];
}

type FlexDoc = { i: number; n: string; a: string; t: string };

/** One game's searchable index. Build it once per page load (`buildFlex`) and reuse it. */
export interface FlexIndex {
  prepared: Prepared[];
  doc: Document<FlexDoc>;
}

export function buildFlex(entries: readonly SearchEntry[]): FlexIndex {
  const prepared: Prepared[] = entries.map((entry) => ({
    entry,
    name: normalize(entry.n),
    aliases: entry.a.map(normalize).filter(Boolean),
    tags: entry.t.map(normalize).filter(Boolean),
  }));
  const doc = new Document<FlexDoc>({
    tokenize: 'forward',
    document: {
      id: 'i',
      index: ['n', 'a', 't'],
    },
  });
  prepared.forEach((p, i) => {
    doc.add({ i, n: p.name, a: p.aliases.join(' '), t: p.tags.join(' ') });
  });
  return { prepared, doc };
}

const words = (text: string): string[] => (text ? text.split(' ') : []);

/**
 * How well `text` (already normalised) answers the query, 0 when it does not. Every query token
 * must start a word of the text; the whole text equal to the query scores highest, then a text
 * that starts with it, then tokens that start the text's first words in order, then any words.
 */
function quality(text: string, q: string, tokens: readonly string[]): number {
  if (!text) return 0;
  if (text === q) return 100;
  if (text.startsWith(q)) return 85;
  const ws = words(text);
  if (!tokens.every((t) => ws.some((w) => w.startsWith(t)))) return 0;
  const inOrder = tokens.every((t, i) => ws[i]?.startsWith(t));
  return inOrder ? 70 : 55;
}

type Scored = { score: number; field: MatchField };

function scoreEntry(p: Prepared, q: string, tokens: readonly string[]): Scored | null {
  let best: Scored | null = null;
  const consider = (text: string, field: MatchField) => {
    const score = quality(text, q, tokens) * FIELD_WEIGHT[field];
    if (score > 0 && (!best || score > best.score)) best = { score, field };
  };
  consider(p.name, 'name');
  for (const a of p.aliases) consider(a, 'alias');
  for (const t of p.tags) consider(t, 'tag');
  return best;
}

/** Does every token match some word of `texts`, exactly as a prefix or with one typo (at least one)? */
function fuzzyMatches(texts: readonly string[], tokens: readonly string[]): boolean {
  const ws = texts.flatMap(words);
  let typo = false;
  for (const t of tokens) {
    if (ws.some((w) => w.startsWith(t))) continue;
    if (!ws.some((w) => fuzzyPrefixMatch(t, w))) return false;
    typo = true;
  }
  return typo;
}

/** Hits for one game: FlexSearch finds candidates, the scorer ranks them, a typo pass fills gaps. */
function searchOne(index: FlexIndex, q: string, tokens: readonly string[]): SearchHit[] {
  const seen = new Set<number>();
  const hits: SearchHit[] = [];
  const fields = index.doc.search(q, { limit: 1000 }) as unknown as {
    field: string;
    result: number[];
  }[];
  for (const { field, result } of fields) {
    const matchField = FIELD_OF[field] ?? 'name';
    for (const i of result) {
      if (seen.has(i)) continue;
      const p = index.prepared[i];
      if (!p) continue;
      seen.add(i);
      const scored = scoreEntry(p, q, tokens);
      // FlexSearch matched but the scorer's stricter word rules did not: keep it, ranked low.
      hits.push({
        entry: p.entry,
        score: scored?.score ?? 8 * FIELD_WEIGHT[matchField],
        field: scored?.field ?? matchField,
        fuzzy: false,
      });
    }
  }
  if (hits.length < TYPO_PASS_BELOW) {
    index.prepared.forEach((p, i) => {
      if (seen.has(i)) return;
      if (fuzzyMatches([p.name], tokens)) {
        hits.push({ entry: p.entry, score: FUZZY_SCORE, field: 'name', fuzzy: true });
      } else if (fuzzyMatches(p.aliases, tokens)) {
        hits.push({ entry: p.entry, score: FUZZY_SCORE - 1, field: 'alias', fuzzy: true });
      }
    });
  }
  return hits;
}

export interface QueryOptions {
  /** Most results per category group (Plans §07: 8). */
  perGroup?: number;
  /** Most results overall, so a one-letter query on "Both games" stays a short list. */
  total?: number;
}

/**
 * Ranked results across the given game indexes, grouped by category (and game). Within a group
 * the best match is first; groups are ordered by their best match. An empty or punctuation-only
 * query finds nothing.
 */
export function query(
  text: string,
  indexes: readonly FlexIndex[],
  { perGroup = 8, total = 40 }: QueryOptions = {},
): SearchGroup[] {
  const q = normalize(text);
  if (!q) return [];
  const tokens = q.split(' ');
  const hits = indexes.flatMap((index) => searchOne(index, q, tokens));
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.n.length - b.entry.n.length ||
      a.entry.n.localeCompare(b.entry.n) ||
      a.entry.id.localeCompare(b.entry.id),
  );

  const groups = new Map<string, SearchGroup>();
  let taken = 0;
  for (const hit of hits) {
    if (taken >= total) break;
    const key = `${hit.entry.g}:${hit.entry.c}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, game: hit.entry.g, category: hit.entry.c, score: hit.score, hits: [] };
      groups.set(key, group);
    }
    if (group.hits.length >= perGroup) continue;
    group.hits.push(hit);
    taken++;
  }
  return [...groups.values()];
}
