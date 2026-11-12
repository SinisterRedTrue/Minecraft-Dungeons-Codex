'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GAMES, type GameId } from '@/config/games';
import { isWithin } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';
import { sectionsOf } from './sectionsOf';

export const SECTION_LINK =
  'inline-flex h-10 items-center rounded-chip px-3 text-sm font-semibold whitespace-nowrap text-text transition-colors hover:bg-accent/20';

/** The current game's eight sections as inline links (shown from 2xl up). */
export function SectionLinks({ game, className }: { game: GameId; className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={`${GAMES[game].name} sections`} className={cn('flex items-center', className)}>
      <ul className="flex items-center">
        {sectionsOf(game).map(({ slug, label, href }) => {
          const current = isWithin(pathname, href);
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(SECTION_LINK, current && 'bg-accent/20 text-accent-text')}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
