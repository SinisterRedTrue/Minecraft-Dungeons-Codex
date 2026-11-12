'use client';

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils/cn';

export type ToggleGroupOption = {
  value: string;
  /** Visible text, e.g. "II". */
  label: string;
  /** Accessible name when the label alone is not enough ("Tier II"). */
  ariaLabel?: string;
  disabled?: boolean;
};

export type ToggleGroupProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ToggleGroupOption[];
  'aria-label': string;
  disabled?: boolean;
  className?: string;
};

/**
 * A segmented single-choice control (tiers I / II / III). Arrow keys move between segments and
 * one segment is always selected: clicking the active one does nothing instead of clearing it.
 */
export function ToggleGroup({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  disabled,
  className,
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onValueChange={(next) => next && onValueChange(next)}
      className={cn(
        'inline-flex overflow-hidden rounded-sm border border-control bg-surface-2',
        disabled && 'opacity-50',
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          aria-label={option.ariaLabel}
          className={cn(
            'min-h-11 min-w-11 cursor-pointer border-r border-control px-3 font-pixel text-sm tracking-pixel text-muted last:border-r-0',
            'hover:bg-surface-3 hover:text-text',
            'data-[state=on]:bg-accent data-[state=on]:text-accent-ink',
            'disabled:cursor-not-allowed',
          )}
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
