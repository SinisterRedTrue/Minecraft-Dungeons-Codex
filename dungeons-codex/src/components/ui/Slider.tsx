'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils/cn';

export type SliderTick = { value: number; label?: string };

/** Round 22px thumb with a 3D bottom edge, shared by Slider and RangeSlider. */
export const THUMB_CLASS =
  'block size-[22px] cursor-grab rounded-full border-2 border-accent-text bg-accent shadow-[0_3px_0_var(--accent-edge)] active:cursor-grabbing pointer-coarse:size-7';

export const TRACK_CLASS =
  'relative h-2.5 grow overflow-hidden rounded-chip border border-control bg-surface-3';
export const RANGE_CLASS = 'absolute h-full bg-accent-text';

export type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
  /** Fires on release or after a key press; use it for expensive work. */
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Tick marks (e.g. the documented power caps), drawn under the track. */
  ticks?: SliderTick[];
  'aria-label': string;
  disabled?: boolean;
  className?: string;
};

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  ticks,
  'aria-label': ariaLabel,
  disabled,
  className,
}: SliderProps) {
  const span = max - min;
  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => v !== undefined && onValueChange(v)}
        onValueCommit={([v]) => v !== undefined && onValueCommit?.(v)}
        className="relative flex h-7 w-full touch-none items-center select-none data-[disabled]:opacity-50"
      >
        <SliderPrimitive.Track className={TRACK_CLASS}>
          <SliderPrimitive.Range className={RANGE_CLASS} />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb aria-label={ariaLabel} className={THUMB_CLASS} />
      </SliderPrimitive.Root>
      {ticks && ticks.length > 0 && span > 0 && (
        <div aria-hidden="true" className="relative mx-[11px] h-8">
          {ticks.map((t) => (
            <span
              key={t.value}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${((t.value - min) / span) * 100}%` }}
            >
              <span className="h-1.5 w-px bg-control" />
              {t.label && (
                <span className="mt-0.5 font-pixel text-micro text-muted">{t.label}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
