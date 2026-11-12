import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { BuildPlanner, PlannerSkeleton } from '@/components/features/planner/BuildPlanner';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
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
    title: `Build Planner · ${GAMES[game].name}`,
    description: `Plan a ${GAMES[game].name} build slot by slot and share it as a link.`,
    path: `/${game}/planner`,
    noindex: true,
  });
}

/**
 * `/[game]/planner`: a static shell. The build (`?b=`, or this browser's draft) and the item data
 * are read on the client when the planner mounts.
 */
export default async function PlannerPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: GAMES[game].name, href: `/${game}` },
          { label: 'Build Planner' },
        ]}
      />
      <div className="mt-4 mb-8">
        <h1 className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
          Build Planner
        </h1>
        <p className="mt-2 max-w-prose text-lg text-muted">
          {game === 'd1'
            ? 'Pick a melee weapon, a ranged weapon, armor and three artifacts, add enchantments and see what the build adds up to.'
            : 'Fill the weapon, armor, artifact and talisman slots, choose enchantments and tiers, and see what the build adds up to.'}{' '}
          Share it as a link or keep it in this browser.
        </p>
      </div>
      <Suspense fallback={<PlannerSkeleton />}>
        <BuildPlanner game={game} />
      </Suspense>
    </div>
  );
}
