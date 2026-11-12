'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { gameSwitchHref } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';

const LABEL = { d1: 'D1', d2: 'D2' } as const;

export type GameSwitcherProps = {
  /** The game this page belongs to (from the layout); neither side is active on neutral pages. */
  active?: GameId;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Segmented D1/D2 pill. Each side keeps the current section when the other game has it, and
 * otherwise goes to that game's hub (`gameSwitchHref`). `active` comes from the server-rendered
 * layout, so the right side is highlighted in the HTML before any JavaScript runs.
 */
export function GameSwitcher({ active, className, onNavigate }: GameSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Choose game"
      className={cn(
        'inline-flex items-center gap-1 rounded-chip border border-line bg-surface-2 p-1',
        className,
      )}
    >
      {GAME_IDS.map((game) => {
        const isActive = game === active;
        return (
          <Link
            key={game}
            href={gameSwitchHref(pathname, game)}
            // Each side carries its own game's accent, so D2 is frost even while D1 is open.
            data-game={game}
            aria-current={isActive ? 'true' : undefined}
            aria-label={`${LABEL[game]}: ${GAMES[game].name}`}
            title={GAMES[game].name}
            onClick={onNavigate}
            className={cn(
              'grid h-9 min-w-11 place-items-center rounded-chip px-3 font-pixel text-micro tracking-pixel uppercase transition-colors duration-200 pointer-coarse:h-11',
              isActive
                ? 'bg-accent text-accent-ink shadow-[0_2px_0_var(--accent-edge)]'
                : 'text-muted hover:bg-accent/20 hover:text-text',
            )}
          >
            {LABEL[game]}
          </Link>
        );
      })}
    </nav>
  );
}
