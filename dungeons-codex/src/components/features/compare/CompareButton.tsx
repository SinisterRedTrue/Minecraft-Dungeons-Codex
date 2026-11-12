'use client';

import { ArrowLeftRight } from 'lucide-react';
import { isComparable } from '@/config/comparable';
import { Button3D } from '@/components/ui/Button3D';
import { useToast } from '@/components/ui/Toast';
import { useIsCompared } from '@/lib/compare/store';
import { cn } from '@/lib/utils/cn';
import { toggleCompareWithFeedback, type CompareItem } from './actions';

/**
 * ⇄ Add to compare. `card` is the small corner button, `detail` the labelled header button.
 * Renders nothing for a category that cannot be compared (the D1 DLCs).
 */
export function CompareButton({
  item,
  variant = 'card',
}: {
  item: CompareItem;
  variant?: 'card' | 'detail';
}) {
  const { toast } = useToast();
  const selected = useIsCompared(item.game, item.category, item.slug);
  if (!isComparable(item.game, item.category)) return null;
  const toggle = () => toggleCompareWithFeedback(toast, item);

  if (variant === 'detail') {
    return (
      <Button3D
        variant={selected ? 'accent' : 'stone'}
        aria-pressed={selected}
        onClick={toggle}
        icon={<ArrowLeftRight size={18} aria-hidden="true" />}
      >
        Compare <span className="sr-only">{item.name}</span>
      </Button3D>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Compare ${item.name}`}
      onClick={toggle}
      data-testid="compare-toggle"
      className={cn(
        'grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-muted transition-colors hover:bg-surface-2 hover:text-accent-text',
        selected && 'bg-accent text-accent-ink hover:bg-accent hover:text-accent-ink',
      )}
    >
      <ArrowLeftRight size={18} aria-hidden="true" />
    </button>
  );
}
