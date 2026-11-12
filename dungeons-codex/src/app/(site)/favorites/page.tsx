import type { Metadata } from 'next';
import { ComingSoon } from '@/components/layout/ComingSoon';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Favorites',
  description: 'Your starred weapons, armor, enchantments and more, kept in your browser.',
  path: '/favorites',
  noindex: true,
});

/** Placeholder until Prompt 11 builds Favorites. */
export default function FavoritesPage() {
  return (
    <ComingSoon
      crumbs={[{ label: 'Home', href: '/' }, { label: 'Favorites' }]}
      title="Favorites"
      heading="Coming in Prompt 11"
      text="Starred items, grouped by game and category, are being built."
    />
  );
}
