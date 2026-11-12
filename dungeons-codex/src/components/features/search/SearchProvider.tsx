'use client';

import { Search } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';

type SearchApi = { open: () => void };

const SearchContext = createContext<SearchApi | null>(null);

/**
 * Holds the open state of the Codex Search dialog so the header button, the hero pill, the 404
 * page and the Ctrl/⌘+K shortcut all open the same one. Until Prompt 09 the dialog is a
 * labelled placeholder; that prompt swaps in the real palette without touching the entry points.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const api = useMemo(() => ({ open }), [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <SearchContext.Provider value={api}>
      {children}
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent
          title="Search the Codex"
          description="Search across weapons, armor, enchantments, mobs and more."
        >
          <div className="flex items-center gap-3 rounded-btn border border-line bg-surface-2 p-4 text-muted">
            <Search size={20} aria-hidden="true" />
            <p>Codex Search is on its way. For now, browse the sections from the menu.</p>
          </div>
        </DialogContent>
      </Dialog>
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchApi {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used inside <SearchProvider>');
  return ctx;
}
