import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { BrowserFallback } from '@/components/filters/BrowserFallback';
import { CategoryBrowser } from '@/components/filters/CategoryBrowser';
import { getCategoryConfig } from '@/config/categories';
import { getFilterConfig } from '@/config/filters';
import {
  GAMES,
  allGameCategories,
  isValidCategory,
  isValidGame,
  type CategorySlug,
} from '@/config/games';
import { getByIds, getListItems } from '@/lib/data';
import { buildLabels, labelFields } from '@/lib/filters/labels';
import { pageMetadata } from '@/lib/seo';
import { formatNumber } from '@/lib/utils/format';

export const dynamicParams = false;

/** All 16 `{ game, category }` pairs. */
export function generateStaticParams() {
  return allGameCategories();
}

type Params = Promise<{ game: string; category: string }>;

async function resolve(params: Params) {
  const { game, category } = await params;
  if (!isValidGame(game) || !isValidCategory(game, category)) return undefined;
  const config = getCategoryConfig(game, category);
  const filters = getFilterConfig(game, category);
  if (!config || !filters) return undefined;
  return { game, category: category as CategorySlug<typeof game>, config, filters };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await resolve(params);
  if (!found) return {};
  const { game, category, config } = found;
  return pageMetadata({
    title: `${config.label} · ${GAMES[game].name}`,
    description: config.intro,
    path: `/${game}/${category}`,
  });
}

/** `/[game]/[category]`: the Category Browser (type selector, filters, sort, grid/table). */
export default async function CategoryPage({ params }: { params: Params }) {
  const found = await resolve(params);
  if (!found) notFound();
  const { game, category, config, filters } = found;

  const items = getListItems(game, category);
  const display = {
    cardStats: config.cardStats,
    cardMeta: config.cardMeta,
  };
  const labelFieldList = labelFields(filters.defs, [
    ...config.cardMeta,
    ...config.tableColumns.filter((c) => c.format === 'label').map((c) => c.field),
  ]);
  const labels = buildLabels({
    game,
    category,
    items,
    fields: labelFieldList,
    lookup: (id) => getByIds([id])[0]?.name,
  });
  const grid = { ...display, labels };

  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: GAMES[game].name, href: `/${game}` },
          { label: config.label },
        ]}
      />
      <div className="mt-4 mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
          {config.label}
        </h1>
        <span
          aria-label={`${formatNumber(items.length)} items`}
          className="font-pixel text-lg text-accent-text"
        >
          {formatNumber(items.length)}
        </span>
        <p className="w-full max-w-prose text-lg text-muted sm:ml-auto sm:w-auto sm:text-right">
          {config.intro}
        </p>
      </div>
      <Suspense
        fallback={
          <BrowserFallback
            items={items}
            sort={filters.sort}
            grid={grid}
            label={config.label}
            withSidebar={filters.defs.length > 0}
          />
        }
      >
        <CategoryBrowser
          label={config.label}
          items={items}
          defs={filters.defs}
          sort={filters.sort}
          grid={grid}
          columns={config.tableColumns}
          groupBy={config.groupBy}
          labels={labels}
          compare={{ game, category }}
        />
      </Suspense>
    </div>
  );
}
