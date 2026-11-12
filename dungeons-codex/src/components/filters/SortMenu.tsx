'use client';

import { Select } from '@/components/ui/Select';
import type { SortDef } from '@/lib/filters/types';

/** The sort dropdown; table headers drive the same value. */
export function SortMenu({
  sort,
  value,
  onChange,
}: {
  sort: SortDef;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-muted">Sort</span>
      <Select
        aria-label="Sort by"
        value={value}
        onValueChange={onChange}
        options={sort.options.map((o) => ({ value: o.value, label: o.label }))}
        className="w-56 min-w-0"
      />
    </div>
  );
}
