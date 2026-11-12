'use client';

import { useEffect } from 'react';
import type { GameId } from '@/config/games';

/**
 * Radix overlays (Dialog, Sheet, Select, Popover, Tooltip, Toast) portal into <body>, outside
 * the `<div data-game>` wrapper, and would fall back to the D1 accent on D2 pages. Mirroring the
 * game onto <body> while a game page is mounted keeps them in the right accent (D-026).
 */
export function GameBodySync({ game }: { game: GameId }) {
  useEffect(() => {
    document.body.dataset.game = game;
    return () => {
      delete document.body.dataset.game;
    };
  }, [game]);
  return null;
}
