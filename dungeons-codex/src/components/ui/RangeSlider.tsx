'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { useId, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { RANGE_CLASS, THUMB_CLASS, TRACK_CLASS } from './Slider';

export type RangeValue = [number, number];

export type RangeSliderProps = {
  value: RangeValue;
  onValueChange: (value: RangeValue) => void;
  /** Fires on release, after a key press, or when a number input is committed. */
  onValueCommit?: (value: RangeValue) => void;
  min: number;
  max: number;
  step?: number;
  /** Names the control for assistive tech and its number inputs, e.g. "Damage". */
  label: string;
  unit?: string;
  className?: string;
};

const INPUT_CLASS =
  'h-11 w-full rounded-sm border border-control bg-surface-2 px-3 text-center font-pixel text-sm text-text tabular-nums';

export function RangeSlider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  label,
  unit,
  className,
}: RangeSliderProps) {
  const id = useId();
  // Text typed into a number input stays a draft until it is committed (blur / Enter).
  const [draft, setDraft] = useState<[string | null, string | null]>([null, null]);

  const commitInput = (index: 0 | 1) => {
    const raw = draft[index];
    setDraft(index === 0 ? [null, draft[1]] : [draft[0], null]);
    if (raw === null) return;
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    const next: RangeValue =
      index === 0
        ? [Math.min(clamped, value[1]), value[1]]
        : [value[0], Math.max(clamped, value[0])];
    onValueChange(next);
    onValueCommit?.(next);
  };

  const inputs = ([0, 1] as const).map((i) => {
    const which = i === 0 ? 'Minimum' : 'Maximum';
    return (
      <label key={i} className="flex flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-muted">
          {which}
          {unit ? ` (${unit})` : ''}
        </span>
        <input
          id={`${id}-${i}`}
          type="number"
          inputMode="decimal"
          aria-label={`${which} ${label}`}
          min={min}
          max={max}
          step={step}
          value={draft[i] ?? String(value[i])}
          onChange={(e) =>
            setDraft(i === 0 ? [e.target.value, draft[1]] : [draft[0], e.target.value])
          }
          onBlur={() => commitInput(i)}
          onKeyDown={(e) => e.key === 'Enter' && commitInput(i)}
          className={INPUT_CLASS}
        />
      </label>
    );
  });

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <SliderPrimitive.Root
        value={value}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={0}
        onValueChange={(v) => v.length === 2 && onValueChange([v[0] as number, v[1] as number])}
        onValueCommit={(v) => v.length === 2 && onValueCommit?.([v[0] as number, v[1] as number])}
        className="relative flex h-7 w-full touch-none items-center select-none"
      >
        <SliderPrimitive.Track className={TRACK_CLASS}>
          <SliderPrimitive.Range className={RANGE_CLASS} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={`Minimum ${label}`} className={THUMB_CLASS} />
        <SliderPrimitive.Thumb aria-label={`Maximum ${label}`} className={THUMB_CLASS} />
      </SliderPrimitive.Root>
      <div className="flex items-end gap-3">{inputs}</div>
    </div>
  );
}
