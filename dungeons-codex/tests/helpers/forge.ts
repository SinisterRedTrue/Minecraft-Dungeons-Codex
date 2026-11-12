/** Forge props and tier props built from the real generated data, the way a detail page does. */
import type { GameId } from '@/config/games';
import { createLoaders } from '@/lib/data/loaders';
import { buildDetailData } from '@/lib/detail/context';
import { forgePropsFor, tierPropsFor } from '@/lib/forge/data';
import type { Entity } from '@/lib/schemas';

const loaders = createLoaders();

function detailFor(game: GameId, category: string, slug: string) {
  const entity = loaders.getBySlug(game, category as never, slug) as unknown as Entity | undefined;
  if (!entity) throw new Error(`fixture ${game}/${category}/${slug} missing`);
  return buildDetailData(loaders, entity);
}

export function realForgeProps(game: GameId, category: string, slug: string) {
  const props = forgePropsFor(detailFor(game, category, slug));
  if (!props) throw new Error(`no Forge for ${game}/${category}/${slug}`);
  return props;
}

export function realTierProps(game: GameId, category: string, slug: string) {
  const props = tierPropsFor(detailFor(game, category, slug));
  if (!props) throw new Error(`no tiers for ${game}/${category}/${slug}`);
  return props;
}

export { detailFor };
