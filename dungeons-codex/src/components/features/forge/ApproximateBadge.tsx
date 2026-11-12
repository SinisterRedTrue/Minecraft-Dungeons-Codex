'use client';

import { Badge } from '@/components/ui/Badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { reasonText, type Value } from '@/lib/forge/damage';

/**
 * The gold dashed "Approximate" badge. It is a button that opens the reason in a popover (not a
 * hover tooltip), so keyboard and touch users can read why the number is not documented.
 */
export function ApproximateBadge({
  value,
  subject = 'damage',
}: {
  value: Pick<Value, 'reason' | 'extrapolated'>;
  subject?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Approximate: why?"
          className="cursor-pointer rounded-xs"
          data-testid="approximate-badge"
        >
          <Badge variant="approximate">Approximate</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="text-sm">
        <p className="font-semibold">Not a documented number</p>
        <p className="mt-1.5 text-muted">{reasonText(value, subject)}</p>
        <p className="mt-1.5 text-muted">
          Numbers from the item&apos;s own wiki table are exact and carry no badge.
        </p>
      </PopoverContent>
    </Popover>
  );
}
