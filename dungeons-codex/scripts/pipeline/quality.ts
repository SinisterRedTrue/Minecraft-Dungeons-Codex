/**
 * `quality`: `partial` when a category-recommended field is missing (`03-CONTENT-MODEL.md` §1).
 * Required fields can never be missing (the schema would reject the record), so these are the
 * optional fields a good page normally has.
 */
import type { Ent } from './types';

const RECOMMENDED: Record<string, string[]> = {
  // Dungeons II pages have no stat bars; talismans and quests have no description to expect.
  'd2:weapons': ['description', 'image'],
  'd2:armor': ['description', 'image'],
  'd2:enchantments': ['description', 'image'],
  'd2:artifacts': ['description', 'image'],
  'd2:talismans': ['image'],
  'd2:quests': [],
  'd2:mobs': ['image', 'health'],
  'd2:locations': ['image', 'description'],
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
function missingFields(entity: Ent): string[] {
  return (
    RECOMMENDED[`${entity.game}:${entity.category}`] ??
    RECOMMENDED[entity.category] ??
    []
  ).filter((field) => {
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
