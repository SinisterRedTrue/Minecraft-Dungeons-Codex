'use client';

import { LayoutGrid, Table2 } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils/cn';

export type ViewMode = 'grid' | 'table';

const OPTIONS = [
  { id: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { id: 'table', label: 'Table view', Icon: Table2 },
] as const;

/** Grid / table switch, plus an optional "group by" chip for the grid (D2 armor: by set). */
export function ViewToggle({
  value,
  onChange,
  group,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  group?: { label: string; on: boolean; onChange: (on: boolean) => void };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {group && value === 'grid' && (
        <Chip selected={group.on} onClick={() => group.onChange(!group.on)}>
          {group.label}
        </Chip>
      )}
      <div
        role="group"
        aria-label="View"
        className="inline-flex items-center gap-1 rounded-chip border border-line bg-surface-2 p-1"
      >
        {OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            className={cn(
              'grid size-9 cursor-pointer place-items-center rounded-chip pointer-coarse:size-11',
              value === id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text',
            )}
          >
            <Icon size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
