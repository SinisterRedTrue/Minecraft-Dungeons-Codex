'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { HeaderSearchButton } from '@/components/features/search/SearchButton';
import type { GameId } from '@/config/games';
import { FavoritesLink } from './FavoritesLink';
import { GameSwitcher } from './GameSwitcher';
import { MobileMenu } from './MobileMenu';
import { SectionLinks } from './SectionLinks';
import { SectionsMenu } from './SectionsMenu';
import { ThemeToggle } from './ThemeToggle';
import { Wordmark } from './Wordmark';

const SCROLL_THRESHOLD = 24;

function subscribeScroll(notify: () => void): () => void {
  window.addEventListener('scroll', notify, { passive: true });
  return () => window.removeEventListener('scroll', notify);
}

/** True once the page has scrolled past 24 px (Plans §05: the nav shrinks and gains a shadow). */
function useScrolled(): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > SCROLL_THRESHOLD,
    () => false,
  );
}

/**
 * Sticky translucent nav in the civilization.gg manner (Design System §2). The outer element
 * keeps a constant height so the page below never jumps; only the visible bar shrinks 68 → 56 px.
 */
export function SiteHeader({ game }: { game?: GameId }) {
  const scrolled = useScrolled();

  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)]">
      <div
        data-scrolled={scrolled}
        className="h-full rounded-nav border-b border-line bg-nav backdrop-blur-[12px] transition-[height,box-shadow] duration-200 data-[scrolled=true]:h-14 data-[scrolled=true]:shadow-soft motion-reduce:transition-none"
      >
        <div className="mx-auto flex h-full max-w-site items-center gap-2 px-4 sm:gap-3 sm:px-[var(--gutter)]">
          <MobileMenu game={game} className="-ml-2 lg:hidden" />

          <Link
            href="/"
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-2"
            aria-label="Dungeons Codex, home"
          >
            <Image src="/brand/logo.svg" alt="" width={34} height={34} unoptimized priority />
            <Wordmark size="sm" className="max-[420px]:hidden" />
          </Link>

          <GameSwitcher active={game} className="ml-1 max-md:hidden" />

          {game && (
            <>
              <SectionLinks game={game} className="ml-2 max-2xl:hidden" />
              <SectionsMenu game={game} className="max-lg:hidden 2xl:hidden" />
            </>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <HeaderSearchButton />
            <FavoritesLink />
            <ThemeToggle className="max-md:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}
