import type { Metadata } from 'next';
import { FavoritesView } from '@/components/features/favorites/FavoritesView';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Favorites',
  description: 'Your starred weapons, armor, enchantments and more, kept in your browser.',
  path: '/favorites',
  noindex: true,
});

/** `/favorites`: a static shell; the list comes from the browser's own storage. */
export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-site px-[var(--gutter)] py-8 sm:py-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Favorites' }]} />
      <div className="mt-4 mb-8">
        <h1 className="font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
          Favorites
        </h1>
        <p className="mt-2 max-w-prose text-lg text-muted">
          Everything you starred, grouped by game and category. It stays in this browser; use Backup
          to move it elsewhere.
        </p>
      </div>
      <FavoritesView />
    </div>
  );
}
