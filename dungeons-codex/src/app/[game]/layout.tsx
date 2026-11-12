import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { GameBodySync } from '@/components/layout/GameBodySync';
import { SiteShell } from '@/components/layout/SiteShell';
import { GAME_IDS, isValidGame } from '@/config/games';

export const dynamicParams = false;

export function generateStaticParams() {
  return GAME_IDS.map((game) => ({ game }));
}

/**
 * Every `/d1/**` and `/d2/**` page. The wrapper's `data-game` switches the accent tokens in
 * the server HTML; `GameBodySync` mirrors it onto <body> so portalled overlays match (D-026).
 */
export default async function GameLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ game: string }>;
}) {
  const { game } = await params;
  if (!isValidGame(game)) notFound();
  return (
    <div data-game={game}>
      <GameBodySync game={game} />
      <SiteShell game={game}>{children}</SiteShell>
    </div>
  );
}
