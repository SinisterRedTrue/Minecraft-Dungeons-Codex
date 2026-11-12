'use client';

import { Star } from 'lucide-react';
import { Button3D } from '@/components/ui/Button3D';
import { useIsFavorite } from '@/lib/favorites/store';
import { cn } from '@/lib/utils/cn';

const ICON_BUTTON =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-muted transition-colors hover:bg-surface-2 hover:text-accent-text';

/**
 * ★ Favorite. `card` is the small corner button on cards; `detail` is the labelled button in the
 * detail header. Both are toggle buttons (`aria-pressed`) named after the item. Until the store
 * has hydrated the button renders "off", the same as the server HTML.
 */
export function FavoriteButton({
  id,
  name,
  variant = 'card',
}: {
  id: string;
  name: string;
  variant?: 'card' | 'detail';
}) {
  const [favorite, toggle] = useIsFavorite(id);
  if (variant === 'detail') {
    return (
      <Button3D
        variant={favorite ? 'gold' : 'stone'}
        aria-pressed={favorite}
        onClick={toggle}
        icon={<Star size={18} aria-hidden="true" className={favorite ? 'fill-current' : ''} />}
      >
        Favorite <span className="sr-only">{name}</span>
      </Button3D>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={`Favorite ${name}`}
      onClick={toggle}
      data-testid="favorite-toggle"
      className={cn(ICON_BUTTON, favorite && 'text-accent-text')}
    >
      <Star size={20} aria-hidden="true" className={favorite ? 'fill-current' : ''} />
    </button>
  );
}
