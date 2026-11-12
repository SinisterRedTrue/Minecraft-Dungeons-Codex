'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { addToCompareWithFeedback } from '@/components/features/compare/actions';
import { Chip } from '@/components/ui/Chip';
import type { ToastOptions } from '@/components/ui/Toast';
import { isComparable } from '@/config/comparable';
import { GAME_IDS, GAMES, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import { MAX_COMPARE, compareStore } from '@/lib/compare/store';
import { query } from '@/lib/search/engine';
import { addRecent, getRecent, type RecentEntry } from '@/lib/search/recent';
import { entryHref } from '@/lib/search/types';
import { GAME_TAG, LIST_CLASS, ResultRow, Row, jumpTargets } from './PaletteRows';
import {
  PaletteEmpty,
  PaletteError,
  PaletteFooter,
  PaletteLoading,
  PaletteNotice,
} from './PaletteStates';
import { usePaletteIndex } from './usePaletteIndex';

type Scope = 'game' | 'both';

export function PaletteBody({
  currentGame,
  onClose,
  onNavigate,
}: {
  currentGame?: GameId;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(currentGame ? 'game' : 'both');
  const [text, setText] = useState('');
  const [recent] = useState(getRecent);
  // Feedback for Ctrl/⌘+Enter. It lives inside the dialog: the page's toasts sit outside a modal
  // dialog, where they cannot be read by a screen reader or clicked.
  const [notice, setNotice] = useState<ToastOptions | null>(null);

  const games: readonly GameId[] = scope === 'game' && currentGame ? [currentGame] : GAME_IDS;
  const { flexes, failed, retry } = usePaletteIndex(games);

  const groups = useMemo(() => (flexes ? query(text, flexes) : []), [flexes, text]);
  const typed = text.trim().length > 0;
  const jumps = useMemo(() => jumpTargets(currentGame), [currentGame]);

  // The highlighted row is the best match of the current query until the user moves it. cmdk
  // alone would keep an old highlight whenever that row is still in the new results, so Enter
  // could open something other than the top hit.
  const firstValue = typed
    ? (groups[0]?.hits[0]?.entry.id ?? '')
    : recent[0]
      ? `recent:${recent[0].id}`
      : `jump:${jumps[0]?.href ?? ''}`;
  const [pick, setPick] = useState<{ q: string; value: string } | null>(null);
  const highlighted = pick?.q === text ? pick.value : firstValue;
  const resultCount = groups.reduce((n, g) => n + g.hits.length, 0);
  // Messages (loading, error, nothing found) sit outside the listbox, which stays mounted but
  // hidden then: a listbox must hold options, and the input points at it with aria-controls.
  const showOptions = Boolean(flexes) && !failed && !(typed && resultCount === 0);
  const both = games.length > 1;

  function openHref(href: string, entry?: RecentEntry) {
    if (entry) addRecent(entry);
    onNavigate();
    onClose();
    router.push(href);
  }

  /** Ctrl/⌘+Enter: add the highlighted item to Compare and keep the palette open. */
  function addHighlightedToCompare() {
    const entry: RecentEntry | undefined = typed
      ? groups.flatMap((g) => g.hits).find((hit) => hit.entry.id === highlighted)?.entry
      : recent.find((r) => `recent:${r.id}` === highlighted);
    if (!entry) {
      setNotice({ title: 'Highlight an item first', description: 'Sections cannot be compared.' });
      return;
    }
    if (!isComparable(entry.g, entry.c)) {
      setNotice({
        title: `${entry.n} cannot be compared`,
        description: 'DLCs are not comparable.',
      });
      return;
    }
    const result = addToCompareWithFeedback(setNotice, {
      game: entry.g,
      category: entry.c,
      slug: entry.s,
      name: entry.n,
    });
    if (result === 'added') {
      const count = compareStore(entry.g).getSnapshot().slugs.length;
      setNotice({
        title: `${entry.n} added to Compare`,
        description: `${count} of ${MAX_COMPARE} selected`,
      });
    } else if (result === 'duplicate') {
      setNotice({ title: `${entry.n} is already in Compare` });
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addHighlightedToCompare();
    }
  }

  const heading = (group: (typeof groups)[number]) => {
    const label = getSection(group.game, group.category)?.label ?? group.category;
    return both ? `${label} · ${GAME_TAG[group.game]}` : label;
  };

  return (
    <Command
      shouldFilter={false}
      loop
      value={highlighted}
      onValueChange={(value) => setPick({ q: text, value })}
      label="Search the Codex"
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
        <Search size={22} aria-hidden="true" className="shrink-0 text-muted" />
        <Command.Input
          value={text}
          onValueChange={(value) => {
            setText(value);
            setNotice(null);
          }}
          placeholder="Search the Codex…"
          aria-label="Search the Codex"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 bg-transparent text-base font-medium text-text outline-none placeholder:text-faint"
        />
        <DialogPrimitive.Close className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-muted transition-colors hover:bg-surface-2 hover:text-text sm:w-auto sm:px-3">
          <X size={20} aria-hidden="true" className="sm:hidden" />
          <span className="sr-only">Close search</span>
          <kbd
            aria-hidden="true"
            className="rounded-xs bg-surface-3 px-1.5 py-0.5 font-pixel text-micro text-muted max-sm:hidden"
          >
            Esc
          </kbd>
        </DialogPrimitive.Close>
      </div>

      {currentGame && (
        <div
          role="group"
          aria-label="Search scope"
          className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-5"
        >
          <Chip selected={scope === 'game'} onClick={() => setScope('game')}>
            This game
            <span className="sr-only"> ({GAMES[currentGame].short})</span>
          </Chip>
          <Chip selected={scope === 'both'} onClick={() => setScope('both')}>
            Both games
          </Chip>
        </div>
      )}

      {failed ? (
        <PaletteError onRetry={retry} />
      ) : !flexes ? (
        <PaletteLoading />
      ) : typed && resultCount === 0 ? (
        <PaletteEmpty
          query={text.trim()}
          onSearchBoth={!both && currentGame ? () => setScope('both') : undefined}
        />
      ) : null}
      <Command.List hidden={!showOptions} className={LIST_CLASS}>
        {showOptions &&
          (typed ? (
            groups.map((group) => (
              <Command.Group key={group.key} heading={heading(group)}>
                {group.hits.map(({ entry }) => (
                  <ResultRow
                    key={entry.id}
                    value={entry.id}
                    entry={entry}
                    onSelect={() => openHref(entryHref(entry), entry)}
                  />
                ))}
              </Command.Group>
            ))
          ) : (
            <>
              {recent.length > 0 && (
                <Command.Group heading="Recent">
                  {recent.map((entry) => (
                    <ResultRow
                      key={entry.id}
                      value={`recent:${entry.id}`}
                      entry={entry}
                      onSelect={() => openHref(entryHref(entry), entry)}
                    />
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Jump to">
                {jumps.map((target) => (
                  <Row
                    key={target.href}
                    value={`jump:${target.href}`}
                    icon={target.icon}
                    title={target.label}
                    subtitle={target.subtitle}
                    game={target.game}
                    onSelect={() => openHref(target.href)}
                  />
                ))}
              </Command.Group>
            </>
          ))}
      </Command.List>

      <div role="status" className="sr-only">
        {flexes && typed
          ? resultCount > 0
            ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
            : 'No results'
          : ''}
      </div>

      {notice && (
        <PaletteNotice
          notice={notice}
          onAction={() => setNotice({ title: 'Started a new comparison' })}
        />
      )}
      <PaletteFooter />
    </Command>
  );
}
