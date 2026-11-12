'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRef, type RefObject } from 'react';
import { OVERLAY_CLASS } from '@/components/ui/Dialog';
import type { GameId } from '@/config/games';
import { cn } from '@/lib/utils/cn';
import { PaletteBody } from './PaletteBody';

export type SearchPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The game of the page the palette was opened on; scopes "This game". */
  currentGame?: GameId;
  /** The element that had focus when the palette opened; it gets focus back on close. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Codex Search: a cmdk list inside a Radix dialog (Plans §07 §1). The body is mounted only while
 * the dialog is open, so its state (query, scope) starts fresh every time. On phones it fills the
 * screen.
 */
export function SearchPalette({
  open,
  onOpenChange,
  currentGame,
  returnFocusRef,
}: SearchPaletteProps) {
  // Opening a result navigates away, so focus then stays with the new page, not the old button.
  const navigated = useRef(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!navigated.current) returnFocusRef?.current?.focus();
          }}
          className={cn(
            'dc-pop fixed z-50 flex flex-col overflow-hidden border-line bg-surface-1 shadow-card',
            // Phones: the whole screen. From sm: a centred panel near the top.
            'inset-0 h-dvh w-full',
            'sm:inset-auto sm:top-[10vh] sm:left-1/2 sm:h-auto sm:max-h-[min(40rem,80dvh)] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-panel sm:border-[1.5px]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search the Codex</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to search weapons, armor, enchantments, mobs and more. Use the arrow keys to move
            through the results and Enter to open one.
          </DialogPrimitive.Description>
          <PaletteBody
            currentGame={currentGame}
            onClose={() => onOpenChange(false)}
            onNavigate={() => {
              navigated.current = true;
            }}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
