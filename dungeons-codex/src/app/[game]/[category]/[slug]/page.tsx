import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetailLayout } from '@/components/entity/DetailLayout';
import { getCategoryConfig } from '@/config/categories';
import { GAMES, allGameCategories, isValidCategory, isValidGame } from '@/config/games';
import { defaultLoaders, getAll, getBySlug } from '@/lib/data';
import { buildDetailData } from '@/lib/detail/context';
import { detailMetaDescription, detailTitleName } from '@/lib/detail/meta';
import type { Entity } from '@/lib/schemas';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

/** Every entity of every category. */
export function generateStaticParams() {
  return allGameCategories().flatMap(({ game, category }) =>
    (getAll(game, category as never) as unknown as Entity[]).map((entity) => ({
      game,
      category,
      slug: entity.slug,
    })),
  );
}

type Params = Promise<{ game: string; category: string; slug: string }>;

async function resolve(params: Params) {
  const { game, category, slug } = await params;
  if (!isValidGame(game) || !isValidCategory(game, category)) return undefined;
  const entity = getBySlug(game, category as never, slug) as unknown as Entity | undefined;
  const config = getCategoryConfig(game, category);
  return entity && config ? { game, category, entity, config } : undefined;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return {};
  const { game, category, entity, config } = found;
  const sameName = (getAll(game, category as never) as unknown as Entity[]).filter(
    (other) => other.name === entity.name,
  ).length;
  return pageMetadata({
    title: `${detailTitleName(entity, sameName)} · ${config.label} · ${GAMES[game].name}`,
    description: detailMetaDescription(entity, config.label, GAMES[game].name),
    path: `/${game}/${category}/${entity.slug}`,
    // The segment's opengraph-image.tsx supplies the card.
    image: null,
  });
}

/** `/[game]/[category]/[slug]`: one entity with its stats, infobox, cross-links and credit. */
export default async function DetailPage({ params }: { params: Params }) {
  const found = await resolve(params);
  if (!found) notFound();
  const { entity, config } = found;
  const data = buildDetailData(defaultLoaders, entity);
  return <DetailLayout data={data} sections={config.detailSections} />;
}
