'use client';

import { Info, Menu, Star } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { isWithin } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';
import { GameSwitcher } from './GameSwitcher';
import { sectionsOf } from './SectionLinks';
import { ThemeToggle } from './ThemeToggle';

const ROW =
  'flex min-h-11 items-center gap-3 rounded-btn px-3 py-2 font-semibold text-text transition-colors hover:bg-accent/20';

/** Hamburger → bottom Sheet with every link: games, the sections, Favorites, About and the theme. */
export function MobileMenu({ game, className }: { game?: GameId; className?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  // Neutral pages list both games' sections so nothing is out of reach.
  const games = game ? [game] : GAME_IDS;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-chip text-text transition-colors hover:bg-accent/20',
          className,
        )}
      >
        <Menu size={24} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent title="Menu">
        <div className="flex flex-col gap-5">
          <GameSwitcher active={game} onNavigate={close} className="self-start md:hidden" />

          {games.map((g) => (
            <nav key={g} aria-label={`${GAMES[g].name} sections`} data-game={g}>
              <p className="mb-1 px-3 font-pixel text-micro tracking-pixel text-accent-text uppercase">
                {GAMES[g].name}
              </p>
              <ul className="grid grid-cols-2 gap-1">
                <li>
                  <SheetClose asChild>
                    <Link
                      href={`/${g}`}
                      aria-current={pathname === `/${g}` ? 'page' : undefined}
                      className={cn(ROW, pathname === `/${g}` && 'bg-accent/20 text-accent-text')}
                    >
                      Overview
                    </Link>
                  </SheetClose>
                </li>
                {sectionsOf(g).map(({ slug, label, href }) => (
                  <li key={slug}>
                    <SheetClose asChild>
                      <Link
                        href={href}
                        aria-current={isWithin(pathname, href) ? 'page' : undefined}
                        className={cn(
                          ROW,
                          isWithin(pathname, href) && 'bg-accent/20 text-accent-text',
                        )}
                      >
                        {label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <ul className="grid grid-cols-2 gap-1 border-t border-line pt-4">
            <li>
              <SheetClose asChild>
                <Link href="/favorites" className={ROW}>
                  <Star size={20} aria-hidden="true" />
                  Favorites
                </Link>
              </SheetClose>
            </li>
            <li>
              <SheetClose asChild>
                <Link href="/about" className={ROW}>
                  <Info size={20} aria-hidden="true" />
                  About
                </Link>
              </SheetClose>
            </li>
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4 md:hidden">
            <span className="font-semibold text-muted">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
