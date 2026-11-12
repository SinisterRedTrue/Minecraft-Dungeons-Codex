import { truncate } from '@/lib/seo';
import type { Entity } from '@/lib/schemas';

/**
 * Meta description (≤ 155 characters): the in-game description or DLC summary when there is one,
 * else a plain sentence built only from what the page is (nothing invented).
 */
export function detailDescription(entity: Entity, categoryLabel: string, gameName: string): string {
  const summary = (entity as unknown as { summary?: string }).summary;
  const text = entity.description ?? summary;
  if (text) return truncate(text);
  return truncate(
    `${entity.name}: ${categoryLabel.toLowerCase()} entry for ${gameName}, with facts, related entries and the Minecraft Wiki source.`,
  );
}

/** Shorter than this, a description is too thin to stand alone in a search result. */
export const MIN_META_DESCRIPTION = 40;

/**
 * The meta description of a detail page: {@link detailDescription} led by the entry's name
 * (unless the text already starts with it), so entries the wiki describes with the same sentence
 * ("Requires Fauna Faire Adventure Pass." is the whole text of seven cosmetics) stay distinct;
 * a result still under {@link MIN_META_DESCRIPTION} characters also gets its category and game.
 */
export function detailMetaDescription(
  entity: Entity,
  categoryLabel: string,
  gameName: string,
): string {
  const text = detailDescription(entity, categoryLabel, gameName);
  const named = text.toLowerCase().startsWith(entity.name.toLowerCase())
    ? text
    : `${entity.name}: ${text}`;
  if (named.length >= MIN_META_DESCRIPTION) return truncate(named);
  return truncate(`${entity.name} (${categoryLabel}, ${gameName}): ${text}`);
}

/**
 * The name used in the page title. Two entries of one category can share a name ("Confetti" is
 * both a flair of the hero and one of a mob); the slug tells them apart so every title is unique.
 */
export function detailTitleName(entity: Entity, sameNameCount: number): string {
  return sameNameCount > 1 ? `${entity.name} (${entity.slug})` : entity.name;
}
