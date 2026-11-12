/**
 * Manual corrections (`data/overrides/{game}/{category}.json`, `[ Plans ]/04-DATA-PIPELINE.md`).
 * Each override names an entity by slug, sets fields (dotted paths allowed, e.g.
 * `stats.damage`), and must cite a `sourceUrl`. Applied after parsing, before validation; the
 * entity's `overrides` field records every changed field.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { GameId } from '@/config/games';
import { slugSchema } from '@/lib/schemas';

export const overrideSchema = z.strictObject({
  slug: slugSchema,
  set: z.record(z.string().min(1), z.unknown()).refine((s) => Object.keys(s).length > 0, {
    message: 'must set at least one field',
  }),
  reason: z.string().trim().min(1),
  sourceUrl: z.url(),
});

export type Override = z.infer<typeof overrideSchema>;

export class OverrideFileError extends Error {
  constructor(
    readonly file: string,
    readonly problems: string[],
  ) {
    super(`${file}:\n${problems.map((p) => `  ✖ ${p}`).join('\n')}`);
    this.name = 'OverrideFileError';
  }
}

/** Reads and validates one overrides file; a missing file is `[]`. */
export function loadOverrides(overridesDir: string, game: GameId, category: string): Override[] {
  const file = path.join(overridesDir, game, `${category}.json`);
  if (!existsSync(file)) return [];
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new OverrideFileError(file, [`invalid JSON: ${(error as Error).message}`]);
  }
  const result = z.array(overrideSchema).safeParse(data);
  if (!result.success) {
    throw new OverrideFileError(
      file,
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return result.data;
}

const FORBIDDEN_FIELDS = new Set(['id', 'slug', 'game', 'category', 'overrides']);

function setPath(target: Record<string, unknown>, dotted: string, value: unknown): void {
  const keys = dotted.split('.');
  const last = keys.pop() ?? dotted;
  let node = target;
  for (const key of keys) {
    const next = node[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[last] = structuredClone(value);
}

export interface ApplyResult<T> {
  entities: T[];
  /** Overrides whose slug matched no entity (reported in the coverage report). */
  unmatched: Override[];
}

/**
 * Applies overrides to copies of `entities` (inputs are not mutated) and records each changed
 * field in `overrides`. Identity fields (`id`, `slug`, `game`, `category`, `overrides`) cannot
 * be overridden.
 */
export function applyOverrides<T extends { slug: string }>(
  entities: readonly T[],
  overrides: readonly Override[],
): ApplyResult<T> {
  const out = entities.map((e) => structuredClone(e));
  const bySlug = new Map(out.map((e) => [e.slug, e]));
  const unmatched: Override[] = [];

  for (const override of overrides) {
    const entity = bySlug.get(override.slug) as (T & { overrides?: unknown[] }) | undefined;
    if (!entity) {
      unmatched.push(override);
      continue;
    }
    for (const [field, value] of Object.entries(override.set)) {
      if (FORBIDDEN_FIELDS.has(field.split('.')[0] ?? field)) {
        throw new Error(`Override for "${override.slug}" may not set "${field}"`);
      }
      setPath(entity as unknown as Record<string, unknown>, field, value);
      entity.overrides = [
        ...(entity.overrides ?? []),
        { field, reason: override.reason, sourceUrl: override.sourceUrl },
      ];
    }
  }
  return { entities: out, unmatched };
}

/**
 * `data/overrides/{game}/expected.json`: corrections to the expected counts the list pages state,
 * for when a page's own number is wrong. Like every override it must cite a source.
 */
export const expectedOverrideSchema = z.strictObject({
  category: z.string().min(1),
  count: z.number().int().positive(),
  reason: z.string().trim().min(1),
  sourceUrl: z.url(),
});

export type ExpectedOverride = z.infer<typeof expectedOverrideSchema>;

export function loadExpectedOverrides(overridesDir: string, game: GameId): ExpectedOverride[] {
  const file = path.join(overridesDir, game, 'expected.json');
  if (!existsSync(file)) return [];
  const result = z.array(expectedOverrideSchema).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!result.success) {
    throw new OverrideFileError(
      file,
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return result.data;
}
