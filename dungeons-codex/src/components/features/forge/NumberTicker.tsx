'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const DURATION_MS = 280;

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Tracks `(prefers-reduced-motion: reduce)`; `false` on the server and before hydration. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/**
 * A number that counts to its new value (Forge result). The animated text is hidden from
 * assistive tech; a visually hidden copy always holds the final value, so a screen reader never
 * hears the in-between numbers. Under reduced motion the value simply changes.
 */
export function NumberTicker({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(value);
  const latest = useRef(value);

  useEffect(() => {
    const from = latest.current;
    if (reduced || from === value) {
      latest.current = value;
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      latest.current = from + (value - from) * eased;
      setAnimated(latest.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  const shown = reduced ? value : animated;
  return (
    <span className={className} data-value={value}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
