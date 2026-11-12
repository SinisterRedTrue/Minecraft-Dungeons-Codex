import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` on the server and during hydration, `true` afterwards. Components that depend on
 * browser-only state (the stores) render a placeholder until it flips, so the first client render
 * matches the server HTML.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
