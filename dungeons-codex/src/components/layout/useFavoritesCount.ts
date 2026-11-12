'use client';

import { useSyncExternalStore } from 'react';
import { safeStorage } from '@/lib/storage/safeStorage';

/** `[ Plans ]/07-FEATURES-SPEC.md` §4: favorites are a JSON `string[]` of entity ids. */
export const FAVORITES_KEY = 'dc:favorites:v1';
/** Prompt 11's store dispatches this after every change so the header count stays live. */
export const FAVORITES_EVENT = 'dc:favorites-change';

function readCount(): number {
  const value = safeStorage.getJSON(FAVORITES_KEY);
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string').length : 0;
}

function subscribe(notify: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === FAVORITES_KEY) notify();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(FAVORITES_EVENT, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(FAVORITES_EVENT, notify);
  };
}

/** Number of favorites; 0 on the server and until Prompt 11 writes any. */
export function useFavoritesCount(): number {
  return useSyncExternalStore(subscribe, readCount, () => 0);
}
