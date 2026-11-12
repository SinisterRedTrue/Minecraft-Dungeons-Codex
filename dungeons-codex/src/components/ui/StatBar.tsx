import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export type StatBarProps = {
  label: string;
  value: number;
  /** The category maximum the bar is filled relative to. */
  max: number;
  unit?: string;
  /** Marks numbers that came from a curve or extrapolation (never silently shown as exact). */
  approximate?: boolean;
  className?: string;
};

export function StatBar({ label, value, max, unit, approximate, className }: StatBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const shown = `${formatNumber(value)}${unit ? ` ${unit}` : ''}`;

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="font-pixel text-sm tracking-pixel text-text">
          {approximate && (
            <span
              title="Approximate"
              className="mr-1.5 inline-block size-2 rounded-full border border-dashed border-rarity-unique align-middle"
            >
              <span className="sr-only">Approximate: </span>
            </span>
          )}
          {shown}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(max, Math.max(0, value))}
        aria-valuetext={shown}
        className="h-2.5 overflow-hidden rounded-chip border border-control bg-surface-3"
      >
        <div
          className="h-full rounded-chip bg-accent-text transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
