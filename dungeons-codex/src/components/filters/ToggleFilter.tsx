'use client';

import { Checkbox } from '@/components/ui/Checkbox';
import type { ToggleDef } from '@/lib/filters/types';

/** A single yes/no filter ("Unique only", "Show unobtainable"). */
export function ToggleFilter({
  def,
  checked,
  onChange,
}: {
  def: ToggleDef;
  checked: boolean;
  /** `null` switches it off (the param leaves the URL). */
  onChange: (value: true | null) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(on) => onChange(on ? true : null)}
      label={def.label}
    />
  );
}
