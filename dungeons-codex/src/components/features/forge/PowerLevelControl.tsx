'use client';

import { useId, useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Slider } from '@/components/ui/Slider';
import { MAX_POWER } from '@/lib/forge/codec';

/** The wiki's documented power caps (Plans §07 §2). */
const CAPS = [
  { value: 250, label: '250', note: 'Normal cap' },
  { value: 256, label: '256', note: 'Daily trial and raid captain' },
  { value: 263, label: '263', note: 'Tower and raid chest' },
] as const;

/**
 * Power level: a number box, a slider with the cap ticks and the three cap buttons, all kept in
 * step. The box may hold half-typed text while it is focused; the slider and buttons clear it.
 * Remount it (a `key`) to drop that text, for example on Reset.
 */
export function PowerLevelControl({
  power,
  onChange,
}: {
  power: number;
  onChange: (value: number) => void;
}) {
  const powerId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (value: number) => {
    setDraft(null);
    onChange(Math.min(MAX_POWER, Math.max(1, value)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={powerId} className="text-sm font-semibold text-text">
          Power level
        </label>
        <input
          id={powerId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_POWER}
          value={draft ?? String(power)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= MAX_POWER) onChange(n);
          }}
          onBlur={() => setDraft(null)}
          className="h-11 w-24 rounded-sm border border-control bg-surface-2 px-3 text-right font-pixel text-base tracking-pixel text-text"
        />
      </div>
      <Slider
        aria-label="Power level slider"
        value={power}
        onValueChange={commit}
        min={1}
        max={MAX_POWER}
        ticks={CAPS.map((cap) => ({ value: cap.value }))}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Documented power caps">
        {CAPS.map((cap) => (
          <Chip
            key={cap.value}
            selected={power === cap.value}
            onClick={() => commit(cap.value)}
            title={cap.note}
          >
            {cap.label}
          </Chip>
        ))}
      </div>
      <p className="m-0 text-xs text-muted">
        Caps: 250 normal, 256 daily trial and raid captain, 263 Tower and raid chest.
      </p>
    </div>
  );
}
