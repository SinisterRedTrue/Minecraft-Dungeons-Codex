/**
 * Validates `data/generated` against the schemas and the cross-reference rules of
 * `[ Plans ]/03-CONTENT-MODEL.md` §5. Pure apart from reading files, so tests can point it at
 * a temp directory.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GAMES, GAME_IDS } from '@/config/games';
import { schemaFor } from '@/lib/schemas';
import {
  compareByName,
  defaultPaths,
  loadUnresolvedReferences,
  loadVocab,
  type DataPaths,
} from './data-files';

export interface ValidationIssue {
  /** `d1/weapons.json` */
  file: string;
  /** Entity id, or `#index` when the entity has no usable id. */
  entity?: string;
  /** Dotted field path. */
  field?: string;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  /** Entities checked per file. */
  counts: Record<string, number>;
}

type Json = Record<string, unknown>;

const ID_PATTERN = /^(?:d1|d2):[a-z]+:[a-z0-9-]+$/;

/** Fields that hold entity ids, which must resolve inside the same game. */
function idRefs(entity: Json): { field: string; id: string }[] {
  const refs: { field: string; id: string }[] = [];
  const list = (field: string) => {
    const value = entity[field];
    if (Array.isArray(value)) {
      value.forEach((id, i) => typeof id === 'string' && refs.push({ field: `${field}.${i}`, id }));
    }
  };
  const single = (field: string) => {
    const value = entity[field];
    if (typeof value === 'string') refs.push({ field, id: value });
  };
  ['related', 'variantIds', 'builtInto', 'locationIds', 'mobIds', 'itemIds', 'questIds'].forEach(
    list,
  );
  ['baseItemId', 'secretOf'].forEach(single);
  const built = entity.builtInEnchantments;
  if (Array.isArray(built)) {
    built.forEach((b: Json, i) => {
      if (typeof b?.enchantmentId === 'string') {
        refs.push({ field: `builtInEnchantments.${i}.enchantmentId`, id: b.enchantmentId });
      }
    });
  }
  return refs;
}

/** Fields that hold an id *or* raw text; raw text must be listed as unresolved. */
function mixedRefs(entity: Json): { field: string; value: string }[] {
  const refs: { field: string; value: string }[] = [];
  for (const field of ['locations', 'drops', 'obtaining']) {
    const value = entity[field];
    if (Array.isArray(value)) {
      value.forEach(
        (v, i) => typeof v === 'string' && refs.push({ field: `${field}.${i}`, value: v }),
      );
    }
  }
  const rewards = entity.rewards;
  if (Array.isArray(rewards)) {
    const push = (field: string, value: unknown) =>
      typeof value === 'string' && refs.push({ field, value });
    rewards.forEach((reward: Json, r) => {
      const items = reward?.items;
      if (Array.isArray(items)) items.forEach((v, i) => push(`rewards.${r}.items.${i}`, v));
      const pools = reward?.randomFrom;
      if (Array.isArray(pools)) {
        pools.forEach((pool: Json, p) => {
          const from = pool?.from;
          if (Array.isArray(from)) {
            from.forEach((v, i) => push(`rewards.${r}.randomFrom.${p}.from.${i}`, v));
          }
        });
      }
    });
  }
  return refs;
}

export function validateData(paths: DataPaths = defaultPaths()): ValidationResult {
  const issues: ValidationIssue[] = [];
  const counts: Record<string, number> = {};

  for (const game of GAME_IDS) {
    const vocab = loadVocab(paths.vocab, game);
    const unresolved = loadUnresolvedReferences(paths.reports, game);
    const entities: { file: string; entity: Json }[] = [];
    const ids = new Map<string, string>();

    for (const category of GAMES[game].categories) {
      const file = `${game}/${category}.json`;
      const full = path.join(paths.generated, game, `${category}.json`);
      if (!existsSync(full)) continue;

      let data: unknown;
      try {
        data = JSON.parse(readFileSync(full, 'utf8'));
      } catch (error) {
        issues.push({ file, message: `invalid JSON: ${(error as Error).message}` });
        continue;
      }
      if (!Array.isArray(data)) {
        issues.push({ file, message: 'must contain a JSON array' });
        continue;
      }
      counts[file] = data.length;

      const schema = schemaFor(game, category, { vocab });
      const slugs = new Set<string>();
      data.forEach((raw: unknown, index) => {
        const entity = (raw ?? {}) as Json;
        const label = typeof entity.id === 'string' ? entity.id : `#${index}`;
        const result = schema.safeParse(raw);
        if (!result.success) {
          for (const issue of result.error.issues) {
            issues.push({
              file,
              entity: label,
              field: issue.path.join('.'),
              message: issue.message,
            });
          }
        }
        if (typeof entity.slug === 'string') {
          if (slugs.has(entity.slug)) {
            issues.push({
              file,
              entity: label,
              field: 'slug',
              message: `duplicate slug "${entity.slug}"`,
            });
          }
          slugs.add(entity.slug);
        }
        if (typeof entity.id === 'string') {
          const other = ids.get(entity.id);
          if (other)
            issues.push({
              file,
              entity: label,
              field: 'id',
              message: `duplicate id (also in ${other})`,
            });
          ids.set(entity.id, file);
        }
        entities.push({ file, entity });
      });

      for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1] as Json;
        const curr = data[i] as Json;
        if (typeof prev?.name !== 'string' || typeof curr?.name !== 'string') continue;
        if (compareByName(prev as { name: string }, curr as { name: string }) > 0) {
          issues.push({
            file,
            entity: typeof curr.id === 'string' ? curr.id : `#${i}`,
            message: `not sorted by name ("${curr.name}" comes after "${prev.name}")`,
          });
          break;
        }
      }
    }

    for (const { file, entity } of entities) {
      const label = typeof entity.id === 'string' ? entity.id : undefined;
      for (const ref of idRefs(entity)) {
        if (!ids.has(ref.id)) {
          issues.push({
            file,
            entity: label,
            field: ref.field,
            message: `unknown ${game} id "${ref.id}"`,
          });
        }
      }
      if (game === 'd1' && typeof entity.dlc === 'string' && !ids.has(`d1:dlcs:${entity.dlc}`)) {
        issues.push({ file, entity: label, field: 'dlc', message: `unknown DLC "${entity.dlc}"` });
      }
      for (const ref of mixedRefs(entity)) {
        if (ID_PATTERN.test(ref.value)) {
          if (!ref.value.startsWith(`${game}:`) || !ids.has(ref.value)) {
            issues.push({
              file,
              entity: label,
              field: ref.field,
              message: `unknown ${game} id "${ref.value}"`,
            });
          }
        } else if (!unresolved.has(ref.value)) {
          issues.push({
            file,
            entity: label,
            field: ref.field,
            message: `raw text "${ref.value}" is not listed under "Unresolved references" in coverage-${game}.md`,
          });
        }
      }
      const image = entity.image as Json | undefined;
      if (typeof image?.src === 'string') {
        const onDisk = path.join(paths.publicDir, ...image.src.split('/').filter(Boolean));
        if (!existsSync(onDisk)) {
          issues.push({
            file,
            entity: label,
            field: 'image.src',
            message: `missing image file public${image.src}`,
          });
        }
      }
    }
  }

  return { issues, counts };
}

export function formatIssue(issue: ValidationIssue): string {
  const where = [issue.file, issue.entity, issue.field].filter(Boolean).join(' › ');
  return `${where}: ${issue.message}`;
}
