/** Types and small helpers shared by the sync pipeline stages. */
import type { Draft } from '../parsers/types';

/** A draft or finished entity: JSON-like with the identity fields every entity has. */
export type Ent = Draft & { id: string; slug: string; category: string };

/** All entities of one game, keyed by category slug. */
export type GameData = Record<string, Ent[]>;

/** A problem the coverage report lists (never fatal on its own). */
export interface Finding {
  category: string;
  entity: string;
  message: string;
}

/** Collected by the stages and rendered into `data/reports/coverage-{game}.md`. */
export interface Findings {
  /** Raw text left in `locations` / `drops` because no entity matched (allowed, listed). */
  unresolved: { category: string; value: string; usedBy: string[] }[];
  /** References that had to be dropped because the field only holds ids. */
  droppedRefs: Finding[];
  /** Slug collisions resolved with `-2`, `-3`. */
  collisions: { category: string; name: string; slug: string }[];
  /** Other remarks (aliases resolved through redirects, …). */
  notes: string[];
}

export const emptyFindings = (): Findings => ({
  unresolved: [],
  droppedRefs: [],
  collisions: [],
  notes: [],
});

export function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export function refsOf(entity: Ent): Record<string, unknown> {
  return (entity._refs ?? {}) as Record<string, unknown>;
}
