'use client';

import { ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { GameId } from '@/config/games';
import { cn } from '@/lib/utils/cn';
import { SECTION_LINK } from './SectionLinks';

const loadPopover = () => import('./SectionsPopover');
const SectionsPopover = dynamic(loadPopover, { ssr: false });

/**
 * "Sections" menu for widths where the inline links don't fit (lg to xl). The button is plain
 * markup; the popover (Radix Popover + Popper) is downloaded when the pointer or focus first
 * reaches the button, or at the latest on the click.
 */
export function SectionsMenu({ game, className }: { game: GameId; className?: string }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => void loadPopover()}
        onFocus={() => void loadPopover()}
        onClick={() => {
          setUsed(true);
          setOpen((current) => !current);
        }}
        className={cn(
          SECTION_LINK,
          'cursor-pointer gap-1.5 border border-line bg-surface-2',
          className,
        )}
      >
        Sections
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {used && (
        <SectionsPopover game={game} open={open} onOpenChange={setOpen} anchorRef={button} />
      )}
    </>
  );
}
