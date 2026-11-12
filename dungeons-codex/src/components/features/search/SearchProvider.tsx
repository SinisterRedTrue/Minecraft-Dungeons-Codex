'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { gameFromPathname } from '@/lib/navigation';

type SearchApi = {
  open: () => void;
  /** Starts downloading the palette code (hover / focus on a search control). */
  preload: () => void;
};

const SearchContext = createContext<SearchApi | null>(null);

// The palette (cmdk + FlexSearch) is not part of any page's first load: it is fetched when a
// search control is hovered or focused, or at the latest when the palette is first opened.
const loadPalette = () => import('./SearchPalette').then((m) => m.SearchPalette);
const SearchPalette = dynamic(loadPalette, { ssr: false });

/** True when the key press happened in something the user is typing into. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.getAttribute('role') === 'textbox'
  );
}

/**
 * Owns the open state of the Codex Search palette so the header button, the hero pill, the 404
 * page, Ctrl/⌘+K and `/` all open the same one (D-066). The palette itself is loaded on demand.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const pathname = usePathname();
  const currentGame = gameFromPathname(pathname);

  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
    setEverOpened(true);
    setOpen(true);
  }, []);
  const preload = useCallback(() => {
    void loadPalette();
  }, []);
  const api = useMemo(() => ({ open, preload }), [open, preload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
        return;
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.defaultPrevented &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <SearchContext.Provider value={api}>
      {children}
      {everOpened && (
        <SearchPalette
          open={isOpen}
          onOpenChange={setOpen}
          currentGame={currentGame}
          returnFocusRef={returnFocusRef}
        />
      )}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchApi {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
