'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RefObject } from 'react';
import { Popover, PopoverClose, PopoverContent } from '@/components/ui/Popover';
import { GAMES, type GameId } from '@/config/games';
import { isWithin } from '@/lib/navigation';
import { cn } from '@/lib/utils/cn';
import { SECTION_LINK } from './SectionLinks';
import { sectionsOf } from './sectionsOf';

/**
 * The popover of the "Sections" menu, anchored to the trigger button that `SectionsMenu` renders.
 * It is a separate module so Radix Popover and Popper are fetched when the menu is first used,
 * not with every page.
 */
export default function SectionsPopover({
  game,
  open,
  onOpenChange,
  anchorRef,
}: {
  game: GameId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const pathname = usePathname();
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={anchorRef} />
      <PopoverContent
        className="w-80 p-2"
        align="start"
        // There is no Radix trigger to hand focus back to: the button is ours.
        // A click on the button itself is the toggle, not an outside click that closes then reopens.
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          anchorRef.current?.focus();
        }}
      >
        <nav aria-label={`${GAMES[game].name} sections`}>
          <ul className="grid grid-cols-2 gap-1">
            {sectionsOf(game).map(({ slug, label, href }) => (
              <li key={slug}>
                <PopoverClose asChild>
                  <Link
                    href={href}
                    aria-current={isWithin(pathname, href) ? 'page' : undefined}
                    className={cn(
                      SECTION_LINK,
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
