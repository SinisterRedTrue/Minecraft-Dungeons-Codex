const nf = new Intl.NumberFormat('en-US');

/** 1234567 → "1,234,567". Non-finite input renders as an en dash rather than "NaN". */
export function formatNumber(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '–';
  return value === Math.trunc(value)
    ? nf.format(value)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: maxFractionDigits }).format(value);
}

/** 0.25 → "25%" (pass a fraction), or 25 → "25%" with `{ fraction: false }`. */
export function formatPercent(
  value: number,
  opts: { fraction?: boolean; digits?: number } = {},
): string {
  if (!Number.isFinite(value)) return '–';
  const { fraction = true, digits = 0 } = opts;
  const pct = fraction ? value * 100 : value;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(pct)}%`;
}

/** 1.5 → "1.5 s", 90 → "1 min 30 s", 3600 → "1 h". */
export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '–';
  if (seconds < 60) return `${trim(seconds)} s`;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : '', s ? `${s} s` : ''].filter(Boolean).join(' ');
}

function trim(n: number): string {
  return String(Math.round(n * 100) / 100);
}
