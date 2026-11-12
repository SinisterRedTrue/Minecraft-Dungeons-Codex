import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchButton } from '@/components/features/search/SearchButton';
import { SiteShell } from '@/components/layout/SiteShell';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { GAMES, GAME_IDS } from '@/config/games';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

/** Friendly 404. Rendered outside the route-group layouts, so it brings its own shell and accent. */
export default function NotFound() {
  return (
    <div data-game="d1">
      <SiteShell>
        <div className="mx-auto max-w-site px-[var(--gutter)] py-16 sm:py-24">
          <EmptyState
            title="This chest is empty"
            text="We couldn't find that page. It may have moved, or the link may be wrong. Try searching, or head back to a game."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <SearchButton />
                {GAME_IDS.map((game) => (
                  <Button3D key={game} asChild variant="stone">
                    <Link href={`/${game}`}>{GAMES[game].name}</Link>
                  </Button3D>
                ))}
              </div>
            }
          />
        </div>
      </SiteShell>
    </div>
  );
}
