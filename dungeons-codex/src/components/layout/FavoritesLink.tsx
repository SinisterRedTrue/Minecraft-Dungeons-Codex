'use client';

import { Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useFavoritesCount } from '@/lib/favorites/store';

/** Header shortcut to `/favorites` with a live count badge (0 → no badge). */
export function FavoritesLink({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const count = useFavoritesCount();
  return (
    <Link
      href="/favorites"
      // The Favorites page carries Zod for its import check; do not fetch it on every page view.
      prefetch={false}
      onClick={onNavigate}
      aria-label={`Favorites, ${count} saved`}
      className={cn(
        'relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-chip px-2 text-text transition-colors hover:bg-accent/20 md:h-10 pointer-coarse:h-11',
        className,
      )}
    >
      <Star size={20} aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="min-w-5 rounded-chip bg-accent px-1.5 text-center font-pixel text-micro leading-5 text-accent-ink"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
