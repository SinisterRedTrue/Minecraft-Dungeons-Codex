import type { GameId } from '@/config/games';
import type { ToastOptions } from '@/components/ui/Toast';
import { humanize } from '@/lib/filters/tokens';
import {
  MAX_COMPARE,
  addToCompare,
  compareStore,
  removeFromCompare,
  startNewCompare,
  type AddResult,
} from '@/lib/compare/store';

/** The item an action works on. */
export interface CompareItem {
  game: GameId;
  category: string;
  slug: string;
  name: string;
}

type Toast = (options: ToastOptions) => void;

const labelOf = (category: string | null) => (category ? humanize(category) : 'items');

/**
 * Adds `item` to its game's comparison and explains a refusal in a toast: a fifth item ("Compare
 * holds up to 4. Remove one first.") or another category (with a "Start a new comparison" action).
 */
export function addToCompareWithFeedback(toast: Toast, item: CompareItem): AddResult {
  const store = compareStore(item.game);
  const result = addToCompare(store, item.category, item.slug);
  if (result === 'full') {
    toast({
      title: `Compare holds up to ${MAX_COMPARE}.`,
      description: 'Remove one first.',
      variant: 'error',
    });
  } else if (result === 'other-category') {
    const current = labelOf(store.getSnapshot().category);
    toast({
      title: `You are comparing ${current}.`,
      description: `${item.name} is in ${labelOf(item.category)}; a comparison holds one category.`,
      action: {
        label: 'Start a new comparison',
        onClick: () => startNewCompare(store, item.category, item.slug),
      },
      duration: 8000,
    });
  }
  return result;
}

/** The ⇄ toggle: adds the item, or removes it when it is already selected. */
export function toggleCompareWithFeedback(toast: Toast, item: CompareItem): void {
  const store = compareStore(item.game);
  const state = store.getSnapshot();
  if (state.category === item.category && state.slugs.includes(item.slug)) {
    removeFromCompare(store, item.slug);
    return;
  }
  addToCompareWithFeedback(toast, item);
}
