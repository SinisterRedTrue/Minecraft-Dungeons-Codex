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
