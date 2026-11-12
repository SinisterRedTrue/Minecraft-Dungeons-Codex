import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/layout/ComingSoon';
import { GAMES, allGameCategories, isValidCategory, isValidGame } from '@/config/games';
import { getSection } from '@/config/sections';
import { getCounts } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { formatNumber } from '@/lib/utils/format';

export const dynamicParams = false;

/** All 16 `{ game, category }` pairs, so none of the hub links can 404. */
export function generateStaticParams() {
  return allGameCategories();
}

type Params = Promise<{ game: string; category: string }>;

async function resolve(params: Params) {
  const { game, category } = await params;
  if (!isValidGame(game) || !isValidCategory(game, category)) return undefined;
  return { game, category, section: getSection(game, category) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found?.section) return {};
  const { game, category, section } = found;
  return pageMetadata({
    title: `${section.label} · ${GAMES[game].name}`,
    description: section.description,
    path: `/${game}/${category}`,
  });
}

/** Placeholder until Prompt 07 builds the Category Browser; it only has to exist and be honest. */
export default async function CategoryStubPage({ params }: { params: Params }) {
  const found = await resolve(params);
  if (!found?.section) notFound();
  const { game, category, section } = found;
  const count = (getCounts(game) as Record<string, number>)[category] ?? 0;

  return (
    <ComingSoon
      crumbs={[
        { label: 'Home', href: '/' },
        { label: GAMES[game].name, href: `/${game}` },
        { label: section.label },
      ]}
      title={`${section.label} · ${formatNumber(count)}`}
      intro={section.description}
      heading="Coming in Prompt 07"
      text={`The filterable browser for all ${formatNumber(count)} ${section.label.toLowerCase()} is being built.`}
    />
  );
}
