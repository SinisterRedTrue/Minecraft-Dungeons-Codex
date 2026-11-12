/**
 * The sync pipeline for one or more games (`[ Plans ]/04-DATA-PIPELINE.md`):
 * parse → normalize → link → derive → overrides → vocab → images → quality → validate → write
 * → forge curves → coverage report.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { schemaFor } from '@/lib/schemas';
import { compareByName, defaultPaths, loadVocab, type DataPaths } from '../lib/data-files';
import { validateData } from '../lib/validator';
import { applyOverrides, loadExpectedOverrides, loadOverrides } from '../overrides';
import { PARSERS } from '../parsers/registry';
import type { ParseResult } from '../parsers/types';
import { resolveRedirects, WikiClient, type ClientOptions } from '../wiki/client';
import { buildForgeCurves } from './forge';
import { syncImages, type ImageJob, type MissingImage } from './images';
import { deriveGame } from './derive';
import { keyOf, linkGame } from './link';
import { ensureUniqueSlugs } from './normalize';
import { applyQuality } from './quality';
import { coverageRatio, loadReport, meetsGate, saveReport, type CategoryReport } from './report';
import { emptyFindings, type Ent, type Findings, type GameData } from './types';
import { applyPropertyTags, syncEnums, syncPropertyVocab } from './vocab';

export interface SyncOptions {
  game: GameId | 'all';
  /** Category slugs, or `all`. */
  categories: string[] | 'all';
  images: boolean;
  client?: ClientOptions;
  root?: string;
  log?: (message: string) => void;
}

export interface SyncOutcome {
  ok: boolean;
  summary: string[];
  problems: string[];
}

const ID_FIELDS_LIST = ['related', 'variantIds', 'builtInto', 'locationIds', 'mobIds', 'itemIds'];
const ID_FIELDS_ONE = ['baseItemId', 'secretOf'];
const ENTITY_ID = /^d[12]:[a-z]+:[a-z0-9-]+$/;
const KEY_PRIORITY = [
  'id',
  'slug',
  'game',
  'category',
  'name',
  'description',
  'rarity',
  'dlc',
  'image',
];
const KEY_LAST = ['tags', 'related', 'source', 'quality', 'overrides'];

/** Stable JSON: priority keys first, the rest alphabetical, bookkeeping keys last. */
function canonical(value: unknown, top = false): unknown {
  if (Array.isArray(value)) return value.map((v) => canonical(v));
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  );
  const rank = (key: string) => {
    if (!top) return 1;
    const first = KEY_PRIORITY.indexOf(key);
    if (first >= 0) return 0;
    return KEY_LAST.includes(key) ? 2 : 1;
  };
  entries.sort(([a], [b]) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (rank(a) === 0) return KEY_PRIORITY.indexOf(a) - KEY_PRIORITY.indexOf(b);
    if (rank(a) === 2) return KEY_LAST.indexOf(a) - KEY_LAST.indexOf(b);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return Object.fromEntries(entries.map(([k, v]) => [k, canonical(v)]));
}

export const stringify = (entities: unknown[]) =>
  `${JSON.stringify(
    entities.map((e) => canonical(e, true)),
    null,
    2,
  )}\n`;

function readCategory(paths: DataPaths, game: GameId, category: string): Ent[] {
  const file = path.join(paths.generated, game, `${category}.json`);
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, 'utf8')) as Ent[];
}

function writeText(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text, 'utf8');
}

/** Removes ids that point at entities that no longer exist (dropped by validation). */
function pruneDangling(data: GameData): void {
  const ids = new Set(Object.values(data).flatMap((list) => list.map((e) => e.id)));
  const alive = (v: unknown) => typeof v !== 'string' || !ENTITY_ID.test(v) || ids.has(v);
  for (const entities of Object.values(data)) {
    for (const entity of entities) {
      for (const field of ID_FIELDS_LIST) {
        if (Array.isArray(entity[field]))
          entity[field] = (entity[field] as unknown[]).filter(alive);
      }
      for (const field of ID_FIELDS_ONE) {
        if (!alive(entity[field])) Reflect.deleteProperty(entity, field);
      }
      if (Array.isArray(entity.builtInEnchantments)) {
        entity.builtInEnchantments = (
          entity.builtInEnchantments as { enchantmentId: string }[]
        ).filter((b) => alive(b.enchantmentId));
      }
      for (const field of ['locations', 'drops']) {
        if (Array.isArray(entity[field]))
          entity[field] = (entity[field] as unknown[]).filter(alive);
      }
    }
  }
}

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 3)
    .map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
    .join('; ');
}

export async function runSync(options: SyncOptions): Promise<SyncOutcome> {
  const log = options.log ?? (() => {});
  const root = options.root ?? process.cwd();
  const paths = defaultPaths(root);
  const client = new WikiClient({
    cacheDir: path.join(root, 'data', 'raw-cache'),
    log,
    ...options.client,
  });
  const outcome: SyncOutcome = { ok: true, summary: [], problems: [] };
  const games = options.game === 'all' ? GAME_IDS : [options.game];

  for (const game of games) {
    const available = GAMES[game].categories as readonly string[];
    const wanted =
      options.categories === 'all' ? [...available] : options.categories.filter((c) => c);
    for (const c of wanted) {
      if (!available.includes(c)) throw new Error(`"${c}" is not a ${game} category`);
    }
    const selected = wanted.filter((c) => PARSERS[game][c]);
    if (selected.length === 0) {
      outcome.summary.push(`${game}: no parsers yet (skipped)`);
      continue;
    }
    for (const c of wanted.filter((c) => !PARSERS[game][c])) {
      outcome.summary.push(`${game}/${c}: no parser yet (skipped)`);
    }
    const result = await syncGame(game, selected, options, paths, client, log);
    outcome.summary.push(...result.summary);
    outcome.problems.push(...result.problems);
  }
  outcome.ok = outcome.problems.length === 0;
  return outcome;
}

async function syncGame(
  game: GameId,
  selected: string[],
  options: SyncOptions,
  paths: DataPaths,
  client: WikiClient,
  log: (m: string) => void,
): Promise<{ summary: string[]; problems: string[] }> {
  const problems: string[] = [];
  const findings: Findings = emptyFindings();
  const ctx = { game, client, log };
  const categories = GAMES[game].categories as readonly string[];

  // 1. Parse the selected categories; read the others as they are on disk.
  const data: GameData = {};
  const parsed = new Map<string, ParseResult>();
  for (const category of categories) {
    if (!selected.includes(category)) {
      data[category] = readCategory(paths, game, category);
      continue;
    }
    const parser = PARSERS[game][category];
    if (!parser) continue;
    log(`${game}/${category}: parsing…`);
    const result = await parser(ctx);
    const corrected = loadExpectedOverrides(paths.overrides, game).find(
      (o) => o.category === category,
    );
    if (corrected) {
      result.expected = {
        count: corrected.count,
        note: `${result.expected.note}; corrected to ${corrected.count}: ${corrected.reason} (${corrected.sourceUrl})`,
      };
    }
    parsed.set(category, result);
    data[category] = result.drafts as Ent[];
    log(`${game}/${category}: ${result.drafts.length} parsed`);
  }

  // 2. Normalize.
  for (const category of selected) ensureUniqueSlugs(category, data[category] ?? [], findings);

  // 3. Link (a dry run first collects names to look up through redirects).
  const misses = new Set<string>();
  linkGame(structuredClone(data), emptyFindings(), { misses });
  const aliases = new Map<string, string>();
  if (misses.size) {
    try {
      const titles = [...misses].map((name) => `Dungeons:${name}`);
      const resolved = await resolveRedirects(titles, client);
      for (const name of misses) {
        const final = resolved.get(`Dungeons:${name}`);
        const bare = final?.replace(/^Dungeons:/i, '');
        if (bare && keyOf(bare) !== keyOf(name)) aliases.set(keyOf(name), bare);
      }
      if (aliases.size) log(`${game}: ${aliases.size} name(s) resolved through redirects`);
    } catch (error) {
      log(`${game}: redirect lookup skipped (${(error as Error).message})`);
    }
  }
  linkGame(data, findings, { aliases });

  // 4. Derive.
  deriveGame(data);

  // 5. Overrides (after linking and deriving, before validation).
  const overrideReport = new Map<
    string,
    { applied: CategoryReport['overridesApplied']; unmatched: string[] }
  >();
  for (const category of selected) {
    const overrides = loadOverrides(paths.overrides, game, category);
    const { entities, unmatched } = applyOverrides(data[category] ?? [], overrides);
    data[category] = entities;
    overrideReport.set(category, {
      applied: entities.flatMap((e) =>
        ((e.overrides as { field: string; reason: string }[] | undefined) ?? []).map((o) => ({
          slug: e.slug,
          field: o.field,
          reason: o.reason,
        })),
      ),
      unmatched: unmatched.map((o) => o.slug),
    });
  }

  // 6. Property vocabulary (fails on unmapped properties) and tags.
  const properties = syncPropertyVocab(paths.vocab, game, data);
  if (properties.generated) {
    log(
      `${game}: generated data/vocab/${game}/properties.json (${Object.keys(properties.vocab).length} properties) — review it`,
    );
  }
  if (properties.unmapped.length) {
    problems.push(
      `${game}: ${properties.unmapped.length} property string(s) are not in data/vocab/${game}/properties.json — add them:\n${properties.unmapped.map((p) => `    "${p}"`).join('\n')}`,
    );
    return { summary: [], problems };
  }
  applyPropertyTags(data, properties.vocab);

  // 7. Images.
  const download = options.images && !client.offline;
  if (options.images && client.offline) log(`${game}: --images is ignored with --offline`);
  const jobs: ImageJob[] = [];
  for (const category of selected) {
    for (const entity of data[category] ?? []) {
      if (typeof entity._image === 'string') {
        jobs.push({
          id: entity.id,
          game,
          category,
          slug: entity.slug,
          name: entity.name,
          file: entity._image,
        });
      }
    }
  }
  log(`${game}: ${download ? 'syncing' : 'reading'} ${jobs.length} images…`);
  const images = await syncImages(jobs, { client, publicDir: paths.publicDir, download, log });
  const missingImages = new Map<string, MissingImage[]>();
  for (const miss of images.missing) {
    const category = miss.id.split(':')[1] ?? '';
    missingImages.set(category, [...(missingImages.get(category) ?? []), miss]);
  }

  // 8. Quality, then strip the internal keys.
  const partial = new Map<string, { id: string; missing: string[] }[]>();
  for (const category of selected) {
    const list: { id: string; missing: string[] }[] = [];
    for (const entity of data[category] ?? []) {
      const image = images.images.get(entity.id);
      if (image) entity.image = image;
      const missing = applyQuality(entity);
      if (missing.length) list.push({ id: entity.id, missing });
    }
    partial.set(category, list);
  }
  for (const entities of Object.values(data)) {
    for (const entity of entities) {
      delete entity._image;
      delete entity._refs;
    }
  }

  // 9. Open-enum vocabulary, then validate every selected entity.
  const enums = syncEnums(paths.vocab, game, data);
  for (const [field, values] of Object.entries(enums.added)) {
    log(`${game}: new ${field} values: ${values.join(', ')}`);
  }
  const vocab = loadVocab(paths.vocab, game);
  const dropped = new Map<string, { name: string; reason: string }[]>();
  for (const category of selected) {
    const schema = schemaFor(game, category as never, { vocab });
    const kept: Ent[] = [];
    const list = [...(parsed.get(category)?.dropped ?? [])];
    for (const entity of data[category] ?? []) {
      const check = schema.safeParse(entity);
      if (check.success) kept.push(entity);
      else list.push({ name: entity.name, reason: `invalid: ${describeIssues(check.error)}` });
    }
    data[category] = kept;
    dropped.set(category, list);
  }
  pruneDangling(data);

  // 10. Write.
  for (const category of categories) {
    const list = [...(data[category] ?? [])].sort(compareByName);
    if (list.length === 0 && !selected.includes(category)) continue;
    writeText(path.join(paths.generated, game, `${category}.json`), stringify(list));
  }
  if (game === 'd1') {
    const curves = buildForgeCurves(data.weapons ?? [], data.armor ?? []);
    writeText(
      path.join(paths.generated, '..', 'forge', 'd1', 'curves.json'),
      `${JSON.stringify(curves, null, 2)}\n`,
    );
  }

  // 11. Coverage report.
  const report = loadReport(paths.reports, game);
  for (const category of selected) {
    const result = parsed.get(category);
    if (!result) continue;
    const entities = data[category] ?? [];
    const consumerOf = (id: string) => id.split(':')[1] === category;
    const overridesFor = overrideReport.get(category);
    const entry: CategoryReport = {
      category,
      expected: result.expected.count,
      expectedNote: result.expected.note,
      parsed: result.drafts.length,
      valid: entities.length,
      dropped: dropped.get(category) ?? [],
      partial: partial.get(category) ?? [],
      missingImages: missingImages.get(category) ?? [],
      slugCollisions: findings.collisions.filter((c) => c.category === category),
      overridesApplied: overridesFor?.applied ?? [],
      overridesUnmatched: overridesFor?.unmatched ?? [],
      unresolved: findings.unresolved
        .filter((u) => u.category === category)
        .map(({ value, usedBy }) => ({ value, usedBy: usedBy.filter(consumerOf) })),
      droppedRefs: findings.droppedRefs
        .filter((d) => d.category === category)
        .map((d) => ({ entity: d.entity, message: d.message })),
      notes: result.notes,
    };
    report.categories[category] = entry;
  }
  saveReport(paths.reports, report);

  // 12. Final check with the same validator `npm run data:validate` uses.
  const validation = validateData(paths);
  const gates = selected.map((c) => report.categories[c]).filter((c): c is CategoryReport => !!c);
  for (const c of gates) {
    if (!meetsGate(c)) {
      problems.push(
        `${game}/${c.category}: coverage ${(coverageRatio(c) * 100).toFixed(1)} % is below the 98 % gate`,
      );
    }
  }
  if (validation.issues.length) {
    problems.push(
      `${game}: data:validate found ${validation.issues.length} issue(s) — run npm run data:validate`,
    );
  }

  const summary = [
    `${game}  category          expected  parsed  valid  cover   partial  dropped  img-miss`,
    ...gates.map(
      (c) =>
        `${game}  ${c.category.padEnd(16)}  ${String(c.expected).padStart(8)}  ${String(c.parsed).padStart(6)}  ${String(c.valid).padStart(5)}  ${`${(coverageRatio(c) * 100).toFixed(1)}%`.padStart(6)}  ${String(c.partial.length).padStart(7)}  ${String(c.dropped.length).padStart(7)}  ${String(c.missingImages.length).padStart(8)}`,
    ),
    `${game}  images: ${images.downloaded} downloaded, ${images.unchanged} unchanged, ${images.missing.length} missing; requests sent: ${client.requestCount}`,
  ];
  return { summary, problems };
}
