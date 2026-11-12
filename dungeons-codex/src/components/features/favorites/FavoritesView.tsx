'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EntityCard, type CardItem } from '@/components/entity/EntityCard';
import { BackupMenu } from '@/components/features/favorites/BackupMenu';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { GAME_IDS, GAMES, isValidCategory, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import { favoritesStore, useFavorites } from '@/lib/favorites/store';
import { loadIndex } from '@/lib/search/loadIndex';
import type { SearchEntry } from '@/lib/search/types';
import { useHydrated } from '@/lib/storage/useHydrated';

/** A search-index entry is all a card needs (name, image, rarity, where it lives). */
function toCardItem(entry: SearchEntry): CardItem {
  return {
    id: entry.id,
    game: entry.g,
    category: entry.c,
    slug: entry.s,
    name: entry.n,
    rarity: entry.r,
    image: entry.i ? { src: entry.i } : undefined,
  };
}

const gameOf = (id: string): GameId | undefined => {
  const game = id.split(':')[0];
  return GAME_IDS.find((g) => g === game);
};

type Loaded =
  | { game: GameId; status: 'ready'; entries: Map<string, SearchEntry> }
  | { game: GameId; status: 'error' };

/**
 * `/favorites`: tabs per game, then the starred items grouped by category as the same cards the
 * browser uses. The names and icons come from the search index (`/search/{game}.json`), fetched
 * for the tab being looked at, so no extra data file is needed.
 */
export function FavoritesView() {
  const hydrated = useHydrated();
  const favorites = useFavorites();
  const counts = useMemo(() => {
    const out: Record<GameId, number> = { d1: 0, d2: 0 };
    for (const id of favorites) {
      const game = gameOf(id);
      if (game) out[game] += 1;
    }
    return out;
  }, [favorites]);

  const [picked, setPicked] = useState<GameId | null>(null);
  const active: GameId = picked ?? (counts.d1 === 0 && counts.d2 > 0 ? 'd2' : 'd1');

  if (!hydrated) return <FavoritesSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-muted">
          <span className="font-pixel text-lg text-accent-text">{favorites.length}</span>{' '}
          {favorites.length === 1 ? 'favorite' : 'favorites'} saved in this browser
        </p>
        <BackupMenu />
      </div>

      <Tabs value={active} onValueChange={(v) => setPicked(v as GameId)}>
        <TabsList aria-label="Game">
          {GAME_IDS.map((game) => (
            <TabsTrigger key={game} value={game} data-game={game}>
              {GAMES[game].short} <span className="ml-1 font-pixel text-micro">{counts[game]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {GAME_IDS.map((game) => (
          <TabsContent key={game} value={game}>
            {game === active && (
              <GameFavorites game={game} ids={favorites} total={favorites.length} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GameFavorites({
  game,
  ids,
  total,
}: {
  game: GameId;
  ids: readonly string[];
  total: number;
}) {
  const mine = useMemo(() => ids.filter((id) => gameOf(id) === game), [ids, game]);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  const hasAny = mine.length > 0;
  useEffect(() => {
    if (!hasAny) return;
    let cancelled = false;
    loadIndex(game).then(
      (list) => {
        if (!cancelled) {
          setLoaded({ game, status: 'ready', entries: new Map(list.map((e) => [e.id, e])) });
        }
      },
      () => !cancelled && setLoaded({ game, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [game, hasAny, attempt]);

  if (mine.length === 0) {
    return (
      <EmptyState
        title={total === 0 ? 'No favorites yet' : `No ${GAMES[game].short} favorites`}
        text="Tap the ★ on any card or item page to keep it here."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            {GAME_IDS.map((g) => (
              <Button3D key={g} asChild variant={g === game ? 'accent' : 'stone'}>
                <Link href={`/${g}`}>Browse {GAMES[g].short}</Link>
              </Button3D>
            ))}
          </div>
        }
      />
    );
  }

  if (loaded?.game === game && loaded.status === 'error') {
    return (
      <EmptyState
        title="Could not load your favorites"
        text="The item list did not download. Check your connection and try again."
        action={
          <Button3D
            onClick={() => {
              setLoaded(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button3D>
        }
      />
    );
  }

  if (loaded?.game !== game || loaded.status !== 'ready') {
    return <FavoritesSkeleton />;
  }

  const entries = loaded.entries;
  const found = mine.flatMap((id) => entries.get(id) ?? []);
  const gone = mine.filter((id) => !entries.has(id));

  return (
    <div className="flex flex-col gap-10">
      {GAMES[game].categories.map((category) => {
        const inCategory = found.filter((e) => e.c === category);
        if (inCategory.length === 0 || !isValidCategory(game, category)) return null;
        const label = getSection(game, category)?.label ?? category;
        return (
          <section key={category} aria-label={label} data-testid={`favorites-${category}`}>
            <h2 className="mb-3 font-display text-h3 font-extrabold text-text uppercase">
              {label}{' '}
              <span className="font-pixel text-base text-accent-text">{inCategory.length}</span>
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4">
              {inCategory.map((entry) => (
                <li key={entry.id}>
                  <EntityCard item={toCardItem(entry)} model={{ meta: '', stats: [] }} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {gone.length > 0 && (
        <section
          aria-label="Items no longer in the data"
          className="rounded-card border-[1.5px] border-line p-4 text-sm text-muted"
        >
          <p>
            {gone.length} saved {gone.length === 1 ? 'item is' : 'items are'} no longer in the data
            (the wiki may have renamed {gone.length === 1 ? 'it' : 'them'}).
          </p>
          <Button3D
            className="mt-3"
            size="sm"
            variant="stone"
            onClick={() =>
              favoritesStore.set(favoritesStore.getSnapshot().filter((id) => !gone.includes(id)))
            }
          >
            Remove {gone.length === 1 ? 'it' : 'them'}
          </Button3D>
        </section>
      )}
    </div>
  );
}

export function FavoritesSkeleton() {
  return (
    <div aria-busy="true" role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading your favorites…</span>
      <Skeleton className="h-11 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-44 rounded-card" />
        ))}
      </div>
    </div>
  );
}
