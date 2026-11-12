/**
 * `quality`: `partial` when a category-recommended field is missing (`03-CONTENT-MODEL.md` §1).
 * Required fields can never be missing (the schema would reject the record), so these are the
 * optional fields a good page normally has.
 */
import type { Ent } from './types';

export const RECOMMENDED: Record<string, string[]> = {
  weapons: ['description', 'stats', 'image'],
  armor: ['description', 'image'],
  enchantments: ['description', 'image', 'tier'],
  artifacts: ['description', 'image'],
  dlcs: ['image', 'releaseDate'],
  cosmetics: ['image', 'description'],
  mobs: ['image', 'health'],
  locations: ['image', 'description'],
};

/** Missing recommended fields of an entity (empty when it is complete). */
export function missingFields(entity: Ent): string[] {
  return (RECOMMENDED[entity.category] ?? []).filter((field) => {
    const value = entity[field];
    return (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && !value.length)
    );
  });
}

/** Sets `quality` and returns the missing fields. */
export function applyQuality(entity: Ent): string[] {
  const missing = missingFields(entity);
  entity.quality = missing.length ? 'partial' : 'verified';
  return missing;
}
