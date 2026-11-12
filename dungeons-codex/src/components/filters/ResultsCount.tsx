import { formatNumber } from '@/lib/utils/format';

/** "42 results", announced politely to screen readers whenever it changes. */
export function ResultsCount({ count, total }: { count: number; total: number }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="font-semibold text-text">
      {formatNumber(count)} {count === 1 ? 'result' : 'results'}
      {count !== total && <span className="font-normal text-muted"> of {formatNumber(total)}</span>}
    </p>
  );
}
