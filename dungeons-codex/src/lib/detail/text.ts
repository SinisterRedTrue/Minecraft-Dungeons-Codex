import { formatNumber } from '@/lib/utils/format';

const ROMAN = ['', 'I', 'II', 'III'];

/** 1 → "I", 2 → "II", 3 → "III" (enchantment levels, talisman tiers); other numbers stay digits. */
export function roman(n: number): string {
  return ROMAN[n] || String(n);
}

/** `70`, `%` → "70%"; `5`, `s` → "5 s"; `10`, `flat` → "10". */
export function formatEffectValue(value: number, unit?: string): string {
  const n = formatNumber(value);
  if (unit === '%') return `${n}%`;
  if (unit === 's') return `${n} s`;
  return n;
}

/** Strings only, trimmed and without empties (data fields that hold optional text). */
export function nonEmpty(values: readonly unknown[] | undefined): string[] {
  return (values ?? []).filter((v): v is string => typeof v === 'string' && v.trim() !== '');
}
