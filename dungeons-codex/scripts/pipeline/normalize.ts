/** Normalization: unique slugs and ids inside a category (`[ Plans ]/03-CONTENT-MODEL.md` §1). */
import type { Ent, Findings } from './types';

/**
 * Within one category the first entity keeps its slug; later ones with the same slug get `-2`,
 * `-3`, … and the collision is recorded. Nothing references an entity by id before linking, so
 * no other field needs to change.
 */
export function ensureUniqueSlugs(category: string, entities: Ent[], findings: Findings): void {
  const seen = new Map<string, number>();
  for (const entity of entities) {
    const base = entity.slug;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (count === 1) continue;
    entity.slug = `${base}-${count}`;
    entity.id = `${String(entity.game)}:${category}:${entity.slug}`;
    findings.collisions.push({ category, name: entity.name, slug: entity.slug });
  }
}
