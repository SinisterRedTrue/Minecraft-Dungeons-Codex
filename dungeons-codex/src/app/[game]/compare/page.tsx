import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense } from 'react';
import { CompareSkeleton, CompareView } from '@/components/features/compare/CompareView';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { comparableCategories, getCategoryConfig } from '@/config/categories';
import { GAMES, isValidGame } from '@/config/games';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(GAMES).map((game) => ({ game }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  if (!isValidGame(game)) return {};
  return pageMetadata({
    title: `Compare · ${GAMES[game].name}`,
    description: `Compare items of ${GAMES[game].name} side by side.`,
    path: `/${game}/compare`,
    noindex: true,
  });
}

/**
 * `/[game]/compare`: a static shell. The selection (`?c=&items=`, or the one stored in the
 * browser) is read on the client, which fetches the category's compare data.
 */
export default async function ComparePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  const categories = comparableCategories(game).map(({ slug, label }) => ({
    slug,
    label,
    rows: getCategoryConfig(game, slug)?.compareRows ?? [],
  }));
  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: GAMES[game].name, href: `/${game}` },
          { label: 'Compare' },
        ]}
      />
      <div className="mt-4 mb-8">
        <h1 className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
          Compare
        </h1>
        <p className="mt-2 max-w-prose text-lg text-muted">
          Put two to four items of one category side by side. The best value of each number is
          marked.
        </p>
      </div>
      <Suspense fallback={<CompareSkeleton />}>
        <NuqsAdapter>
          <CompareView game={game} categories={categories} />
        </NuqsAdapter>
      </Suspense>
    </div>
  );
}
