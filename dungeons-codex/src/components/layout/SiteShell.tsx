import type { ReactNode } from 'react';
import { SearchProvider } from '@/components/features/search/SearchProvider';
import { GAME_IDS, type GameId } from '@/config/games';
import { getSyncDate } from '@/lib/data';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** The most recent sync across both games (ISO dates sort as strings). */
function latestSyncDate(): string | undefined {
  return GAME_IDS.map(getSyncDate)
    .filter((d): d is string => d !== undefined)
    .sort()
    .at(-1);
}

/**
 * Skip link, header, `<main id="main">` and footer. Rendered inside a `<div data-game>` by the
 * `(site)` and `[game]` layouts (and by `not-found`), so the accent is right in the server HTML.
 * `game` is undefined on neutral pages (picker, About, Favorites, 404).
 */
export function SiteShell({ game, children }: { game?: GameId; children: ReactNode }) {
  return (
    <SearchProvider>
      <a
        href="#main"
        className="sr-only z-[70] rounded-btn bg-accent px-4 py-3 font-bold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader game={game} />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        {children}
      </main>
      <SiteFooter syncDate={latestSyncDate()} />
    </SearchProvider>
  );
}
