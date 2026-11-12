'use client';

import { parseAsArrayOf, parseAsBoolean, parseAsString, useQueryStates } from 'nuqs';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddItemPicker } from '@/components/features/compare/AddItemPicker';
import { CompareTable } from '@/components/features/compare/CompareTable';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import type { CompareRow } from '@/config/categories';
import type { GameId } from '@/config/games';
import { loadCompare } from '@/lib/compare/load';
import {
  MAX_COMPARE,
  clearCompare,
  compareStore,
  setCompare,
  useCompareState,
} from '@/lib/compare/store';
import type { CompareEntry } from '@/lib/compare/types';
import { useHydrated } from '@/lib/storage/useHydrated';

export interface CompareCategory {
  slug: string;
  label: string;
  rows: CompareRow[];
}

type Loaded =
  { key: string; status: 'ready'; entries: CompareEntry[] } | { key: string; status: 'error' };

const parsers = {
  c: parseAsString,
  items: parseAsArrayOf(parseAsString),
  diff: parseAsBoolean.withDefault(false),
};

/**
 * The Compare page body. The selection comes from the URL (`?c=weapons&items=a,b`) when it has
 * one, otherwise from the stored selection of this game (`dc:compare:{game}`); every change
 * writes both, so a shared link and the tray on the category page stay in step.
 */
export function CompareView({
  game,
  categories,
}: {
  game: GameId;
  categories: readonly CompareCategory[];
}) {
  const { toast } = useToast();
  const hydrated = useHydrated();
  const [query, setQuery] = useQueryStates(parsers, { history: 'replace', clearOnDefault: true });
  const stored = useCompareState(game);
  const store = compareStore(game);

  const urlCategory = categories.find((c) => c.slug === query.c);
  const storedCategory = categories.find((c) => c.slug === stored.category);
  const category = urlCategory ?? (query.c ? undefined : storedCategory);
  const storedSlugs = stored.category === category?.slug ? stored.slugs : undefined;
  const slugs: readonly string[] = useMemo(() => {
    const fromUrl = urlCategory ? (query.items ?? []).slice(0, MAX_COMPARE) : [];
    return fromUrl.length > 0 ? fromUrl : (storedSlugs ?? []);
  }, [urlCategory, query.items, storedSlugs]);

  // The category's data, fetched once per page view.
  const key = category ? `${game}/${category.slug}` : '';
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    loadCompare(game, category.slug).then(
      (entries) => !cancelled && setLoaded({ key, status: 'ready', entries }),
      () => !cancelled && setLoaded({ key, status: 'error' }),
    );
    return () => {
      cancelled = true;
    };
  }, [game, category, key, attempt]);
  const data = loaded?.key === key ? loaded : null;
  const entries = data?.status === 'ready' ? data.entries : undefined;

  const selected = useMemo(() => {
    if (!entries) return [];
    const bySlug = new Map(entries.map((e) => [e.s, e]));
    return slugs.flatMap((s) => bySlug.get(s) ?? []);
  }, [entries, slugs]);
  const missing = entries ? slugs.length - selected.length : 0;

  const [notice, setNotice] = useState('');
  const commit = useCallback(
    (nextCategory: string, next: readonly string[]) => {
      setCompare(store, nextCategory, next);
      void setQuery({
        c: nextCategory,
        items: next.length > 0 ? [...next] : null,
      });
    },
    [store, setQuery],
  );

  if (!hydrated) return <CompareSkeleton />;

  if (!category) {
    return (
      <EmptyState
        title="Pick something to compare"
        text="Choose a category, then add two to four items. You can also use the ⇄ button on any card."
        action={
          <div className="mx-auto w-64 max-w-full">
            <Select
              aria-label="Category to compare"
              placeholder="Choose a category"
              options={categories.map((c) => ({ value: c.slug, label: c.label }))}
              onValueChange={(slug) => void setQuery({ c: slug, items: null })}
            />
          </div>
        }
      />
    );
  }

  const add = (slug: string) => {
    if (slugs.includes(slug)) return;
    if (slugs.length >= MAX_COMPARE) {
      toast({
        title: `Compare holds up to ${MAX_COMPARE}.`,
        description: 'Remove one first.',
        variant: 'error',
      });
      return;
    }
    commit(category.slug, [...slugs, slug]);
    setNotice(`${entries?.find((e) => e.s === slug)?.n ?? slug} added`);
  };
  const remove = (slug: string) => {
    commit(
      category.slug,
      slugs.filter((s) => s !== slug),
    );
    setNotice(`${entries?.find((e) => e.s === slug)?.n ?? slug} removed`);
  };
  const clearAll = () => {
    clearCompare(store);
    void setQuery({ c: null, items: null, diff: null });
  };

  const picker = entries ? (
    <AddItemPicker
      categoryLabel={category.label}
      entries={entries}
      selected={selected.map((e) => e.s)}
      onAdd={add}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 className="font-display text-h2 leading-tight font-black tracking-display text-text uppercase">
          {category.label}
        </h2>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <Switch
            label="Differences only"
            checked={query.diff}
            onCheckedChange={(on) => void setQuery({ diff: on })}
          />
          {/* With fewer than two items the empty state below holds the picker. */}
          {selected.length >= 2 && picker}
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-11 cursor-pointer items-center rounded-btn px-3 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div role="status" className="sr-only">
        {notice}
      </div>

      {data?.status === 'error' ? (
        <EmptyState
          title="Could not load the comparison data"
          text="Check your connection and try again."
          action={<Button3D onClick={() => setAttempt((n) => n + 1)}>Try again</Button3D>}
        />
      ) : !entries ? (
        <CompareSkeleton />
      ) : (
        <>
          {missing > 0 && (
            <p role="note" className="text-sm text-muted">
              {missing} {missing === 1 ? 'item' : 'items'} from this link{' '}
              {missing === 1 ? 'is' : 'are'} not in the {category.label} list and{' '}
              {missing === 1 ? 'was' : 'were'} left out.
            </p>
          )}
          {selected.length < 2 ? (
            <EmptyState
              title={selected.length === 0 ? `Nothing to compare yet` : `Add one more to compare`}
              text={
                selected.length === 0
                  ? `Pick at least two ${category.label.toLowerCase()} with Add item, or use the ⇄ button on a card.`
                  : `${selected[0]?.n} is selected. Add at least one more ${category.label.toLowerCase()} item.`
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {picker}
                  <Button3D asChild variant="stone">
                    <Link href={`/${game}/${category.slug}`}>Browse {category.label}</Link>
                  </Button3D>
                </div>
              }
            />
          ) : (
            <CompareTable
              game={game}
              category={category.slug}
              caption={`Comparison of ${selected.length} ${category.label.toLowerCase()}`}
              rows={category.rows}
              entries={selected}
              diffOnly={query.diff}
              onRemove={remove}
            />
          )}
        </>
      )}
    </div>
  );
}

/** Placeholder with the final height of a small table, shown until the browser has hydrated. */
export function CompareSkeleton() {
  return (
    <div aria-busy="true" role="status" className="flex flex-col gap-3">
      <span className="sr-only">Loading the comparison…</span>
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full rounded-card" />
    </div>
  );
}
