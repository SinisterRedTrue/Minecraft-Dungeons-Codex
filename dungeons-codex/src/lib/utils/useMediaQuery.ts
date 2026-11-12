import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query matches. `false` on the server and during hydration (the layout
 * that depends on it is only ever rendered after a user action), live afterwards.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
