/**
 * The list projection of entities (`[ Plans ]/03-CONTENT-MODEL.md` §6): the base fields plus the
 * category's `LIST_FIELDS` and the derived fields the filters need. It lives apart from the
 * server-only loaders so `scripts/` (the planner data files) can use the exact same projection
 * as the category pages.
 */
import { LIST_FIELDS } from '@/config/categories';
import type { GameId } from '@/config/games';
import { deriveListFields } from '@/lib/filters/derive';
import { LIST_BASE_FIELDS, type Entity, type EntityListItem } from '@/lib/schemas';

export function projectListItems(
  game: GameId,
  category: string,
  entities: readonly Entity[],
): EntityListItem[] {
  const extra = (LIST_FIELDS[game] as Record<string, readonly string[]>)[category] ?? [];
  const fields = [...LIST_BASE_FIELDS, 'game', 'category', ...extra];
  return entities.map((entity): EntityListItem => {
    const raw = entity as unknown as Record<string, unknown>;
    const item: Record<string, unknown> = {};
    for (const field of fields) {
      const value = raw[field];
      if (value !== undefined) item[field] = value;
    }
    // Sums, maxima and parsed effects the filters need (06-FILTERS-SPEC "derived").
    Object.assign(item, deriveListFields(game, category, raw));
    return item as EntityListItem;
  });
}
