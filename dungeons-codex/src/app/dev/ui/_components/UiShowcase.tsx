'use client';

import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Chip } from '@/components/ui/Chip';
import { BrandSection } from './BrandSection';
import { ButtonsSection } from './ButtonsSection';
import { FormsSection } from './FormsSection';
import { ItemsSection } from './ItemsSection';
import { LayoutSection } from './LayoutSection';
import { OverlaysSection } from './OverlaysSection';
import { SurfacesSection } from './SurfacesSection';

type Game = 'd1' | 'd2';

export function UiShowcase() {
  const [game, setGame] = useState<Game>('d1');

  // Radix portals (dialogs, selects, toasts) render under <body>, outside the wrapper below,
  // so mirror the accent there too.
  useEffect(() => {
    document.body.dataset.game = game;
    return () => {
      delete document.body.dataset.game;
    };
  }, [game]);

  return (
    <div data-game={game} className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-40 border-b border-line bg-nav backdrop-blur-md">
        <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="font-display text-xl font-black tracking-display uppercase">UI kit</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Game accent" className="flex gap-2">
              <Chip selected={game === 'd1'} onClick={() => setGame('d1')}>
                D1 emerald
              </Chip>
              <Chip selected={game === 'd2'} onClick={() => setGame('d2')}>
                D2 frost
              </Chip>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-site flex-col gap-12 px-5 py-10">
        <BrandSection />
        <ButtonsSection />
        <SurfacesSection />
        <ItemsSection />
        <FormsSection />
        <OverlaysSection />
        <LayoutSection />
      </main>
    </div>
  );
}
