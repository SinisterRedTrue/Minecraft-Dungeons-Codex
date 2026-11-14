'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { formatNumber } from '@/lib/utils/format';

/**
 * Mobile filters: a "Filters (n)" button that opens a bottom sheet holding the panel, with a
 * sticky footer — "Show n results" closes the sheet, "Clear" resets every filter.
 */
export function FiltersSheet({
  activeCount,
  resultCount,
  onClear,
  children,
}: {
  activeCount: number;
  resultCount: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button3D variant="stone" icon={<SlidersHorizontal size={18} aria-hidden="true" />}>
          Advanced{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button3D>
      </SheetTrigger>
      <SheetContent
        title="Advanced filters"
        description="Narrow the results. Changes apply right away."
        focusSheet
      >
        {children}
        <div className="sticky -bottom-8 z-10 -mx-6 mt-4 flex gap-3 border-t border-line bg-surface-1 px-6 py-4">
          <SheetClose asChild>
            <Button3D fullWidth>
              Show {formatNumber(resultCount)} {resultCount === 1 ? 'result' : 'results'}
            </Button3D>
          </SheetClose>
          <Button3D variant="ghost" onClick={onClear} disabled={activeCount === 0}>
            Clear
          </Button3D>
        </div>
      </SheetContent>
    </Sheet>
  );
}
