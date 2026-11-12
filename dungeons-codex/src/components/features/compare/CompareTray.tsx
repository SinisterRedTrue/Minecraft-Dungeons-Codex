'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { isComparable } from '@/config/comparable';
import type { GameId } from '@/config/games';
import {
  MAX_COMPARE,
  clearCompare,
  compareStore,
  removeFromCompare,
  useCompareState,
} from '@/lib/compare/store';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

export interface TrayItem {
  slug: string;
  name: string;
  rarity?: string | undefined;
  image?: { src: string } | undefined;
}

/** `/d1/compare?c=weapons&items=claymore,katana` */
export function compareHref(game: GameId, category: string, slugs: readonly string[]): string {
  return `/${game}/compare?c=${category}&items=${slugs.join(',')}`;
}

/**
 * The sticky tray at the bottom of a category page while items of this category are selected:
 * thumbnails (click one to remove it), the count, Compare and Clear (Wireframes §3). Renders
 * nothing otherwise, and nothing on the server (the selection lives in the browser).
 */
export function CompareTray({
  game,
  category,
  items,
}: {
  game: GameId;
  category: string;
  items: readonly TrayItem[];
}) {
  const state = useCompareState(game);
  const bySlug = useMemo(() => new Map(items.map((i) => [i.slug, i])), [items]);
  if (!isComparable(game, category) || state.category !== category || state.slugs.length === 0) {
    return null;
  }
  const store = compareStore(game);
  const selected = state.slugs.flatMap((slug) => bySlug.get(slug) ?? []);

  return (
    <section
      aria-label="Compare tray"
      data-testid="compare-tray"
      className="sticky bottom-3 z-30 mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel border-[1.5px] border-line-strong bg-nav p-3 shadow-card backdrop-blur-md"
    >
      <ul aria-label="Selected for comparison" className="flex items-center gap-1">
        {selected.map((item) => (
          <li key={item.slug}>
            <button
              type="button"
              onClick={() => removeFromCompare(store, item.slug)}
              aria-label={`Remove ${item.name} from comparison`}
              title={`Remove ${item.name}`}
              className="group relative grid size-11 cursor-pointer place-items-center rounded-btn"
            >
              <RarityFrame
                size={48}
                rarity={RARITIES.find((r) => r === item.rarity)}
                src={item.image?.src}
                alt=""
                className="size-10"
              />
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-chip bg-surface-3 text-text opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100"
              >
                <X size={10} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="font-pixel text-sm tracking-pixel text-text uppercase">
        <span data-testid="compare-count">{state.slugs.length}</span>/{MAX_COMPARE} selected
      </p>
      <div className="ml-auto flex items-center gap-2">
        <Button3D asChild>
          <Link href={compareHref(game, category, state.slugs)}>Compare</Link>
        </Button3D>
        <button
          type="button"
          onClick={() => clearCompare(store)}
          className="inline-flex h-11 cursor-pointer items-center rounded-btn px-3 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
