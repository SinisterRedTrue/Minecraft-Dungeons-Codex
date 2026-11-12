import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/layout/ComingSoon';
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

/** Placeholder until Prompt 12 builds the Build Planner. */
export default async function PlannerPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  return (
    <ComingSoon
      crumbs={[
        { label: 'Home', href: '/' },
        { label: GAMES[game].name, href: `/${game}` },
        { label: 'Build Planner' },
      ]}
      title="Build Planner"
      heading="Coming in Prompt 12"
      text="The slot-by-slot Build Planner is being built."
    />
  );
}
