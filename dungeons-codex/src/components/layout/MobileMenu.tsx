'use client';

import { Menu } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { GameId } from '@/config/games';
import { cn } from '@/lib/utils/cn';

const loadSheet = () => import('./MobileMenuSheet');
const MobileMenuSheet = dynamic(loadSheet, { ssr: false });

/**
 * Hamburger → bottom Sheet with every link. The button is plain markup; the sheet (Radix Dialog)
 * is downloaded when the pointer or focus first reaches the button, or at the latest on the click.
 */
export function MobileMenu({ game, className }: { game?: GameId; className?: string }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={() => void loadSheet()}
        onFocus={() => void loadSheet()}
        onTouchStart={() => void loadSheet()}
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-chip text-text transition-colors hover:bg-accent/20',
          className,
        )}
      >
        <Menu size={24} aria-hidden="true" />
      </button>
      {used && (
        <MobileMenuSheet game={game} open={open} onOpenChange={setOpen} returnFocusRef={button} />
      )}
    </>
  );
}
