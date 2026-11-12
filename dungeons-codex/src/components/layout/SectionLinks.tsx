'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { GAMES, type CategorySlug, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import { isWithin } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';

export function sectionsOf(
  game: GameId,
): { slug: CategorySlug<GameId>; label: string; href: string }[] {
  return (GAMES[game].categories as readonly CategorySlug<GameId>[]).map((slug) => ({
    slug,
    label: getSection(game, slug)?.label ?? slug,
    href: `/${game}/${slug}`,
  }));
}

const LINK =
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
                className={cn(LINK, current && 'bg-accent/20 text-accent-text')}
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

/** "Sections" menu for widths where the inline links don't fit (lg to xl). */
export function SectionsMenu({ game, className }: { game: GameId; className?: string }) {
  const pathname = usePathname();
  return (
    <Popover>
      <PopoverTrigger
        className={cn(LINK, 'cursor-pointer gap-1.5 border border-line bg-surface-2', className)}
      >
        Sections
        <ChevronDown size={16} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <nav aria-label={`${GAMES[game].name} sections`}>
          <ul className="grid grid-cols-2 gap-1">
            {sectionsOf(game).map(({ slug, label, href }) => (
              <li key={slug}>
                <PopoverClose asChild>
                  <Link
                    href={href}
                    aria-current={isWithin(pathname, href) ? 'page' : undefined}
                    className={cn(
                      LINK,
                      'w-full',
                      isWithin(pathname, href) && 'bg-accent/20 text-accent-text',
                    )}
                  >
                    {label}
                  </Link>
                </PopoverClose>
              </li>
            ))}
          </ul>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
