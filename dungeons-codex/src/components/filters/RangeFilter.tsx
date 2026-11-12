'use client';

import { useState } from 'react';
import { RangeSlider, type RangeValue } from '@/components/ui/RangeSlider';
import type { Bounds, RangeDef } from '@/lib/filters/types';

export type RangeFilterProps = {
  def: RangeDef;
  bounds: Bounds;
  /** The active range; `undefined` means the full bounds. */
  value: readonly [number, number] | undefined;
  /** `null` clears the filter. Called on every drag step, so the URL update should `replace`. */
  onChange: (value: readonly [number, number] | null) => void;
  /** Items hidden only because they lack this stat (shown while the range is narrowed). */
  missing: number;
};

/** A two-thumb slider with number inputs; dragging back to the full bounds clears the filter. */
export function RangeFilter({ def, bounds, value, onChange, missing }: RangeFilterProps) {
  // While a thumb is dragged the slider keeps its own position; the URL follows.
  const [drag, setDrag] = useState<RangeValue | null>(null);
  const current: RangeValue = drag ?? (value ? [value[0], value[1]] : [bounds.min, bounds.max]);
  const narrowed = current[0] > bounds.min || current[1] < bounds.max;

  const apply = (next: RangeValue) => {
    const full = next[0] <= bounds.min && next[1] >= bounds.max;
    onChange(full ? null : next);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="font-pixel text-sm text-text tabular-nums">
        {current[0]} – {current[1]}
        {def.unit}
      </p>
      <RangeSlider
        label={def.label}
        unit={def.unit?.trim()}
        min={bounds.min}
        max={bounds.max}
        step={def.step}
        value={current}
        onValueChange={(next) => {
          setDrag(next);
          apply(next);
        }}
        onValueCommit={(next) => {
          setDrag(null);
          apply(next);
        }}
      />
      {narrowed && missing > 0 && (
        <p className="text-xs text-muted">
          {missing} {missing === 1 ? 'item' : 'items'} without this stat{' '}
          {missing === 1 ? 'is' : 'are'} hidden.
        </p>
      )}
    </div>
  );
}
