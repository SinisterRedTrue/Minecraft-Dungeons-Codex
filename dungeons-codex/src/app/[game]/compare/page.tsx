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
    title: `Compare · ${GAMES[game].name}`,
    description: `Compare items of ${GAMES[game].name} side by side.`,
    path: `/${game}/compare`,
    noindex: true,
  });
}

/** Placeholder until Prompt 11 builds Compare. */
export default async function ComparePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  return (
    <ComingSoon
      crumbs={[
        { label: 'Home', href: '/' },
        { label: GAMES[game].name, href: `/${game}` },
        { label: 'Compare' },
      ]}
      title="Compare"
      heading="Coming in Prompt 11"
      text="Side-by-side comparison of up to four items is being built."
    />
  );
}
