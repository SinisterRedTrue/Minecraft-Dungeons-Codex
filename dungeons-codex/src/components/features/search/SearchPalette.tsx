'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { CornerDownLeft, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { addToCompareWithFeedback } from '@/components/features/compare/actions';
import { Badge } from '@/components/ui/Badge';
import { Button3D } from '@/components/ui/Button3D';
import { Chip } from '@/components/ui/Chip';
import { OVERLAY_CLASS } from '@/components/ui/Dialog';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ToastOptions } from '@/components/ui/Toast';
import { isComparable } from '@/config/comparable';
import { GAME_IDS, GAMES, type GameId } from '@/config/games';
import { getSection, SECTIONS } from '@/config/sections';
import { query, type FlexIndex } from '@/lib/search/engine';
import { MAX_COMPARE, compareStore } from '@/lib/compare/store';
import { loadFlex, peekFlex } from '@/lib/search/loadIndex';
import { addRecent, getRecent, type RecentEntry } from '@/lib/search/recent';
import { entryHref } from '@/lib/search/types';
import { cn } from '@/lib/utils/cn';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];
const GAME_TAG: Record<GameId, string> = { d1: 'D1', d2: 'D2' };

export type SearchPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The game of the page the palette was opened on; scopes "This game". */
  currentGame?: GameId;
  /** The element that had focus when the palette opened; it gets focus back on close. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/**
 * Codex Search: a cmdk list inside a Radix dialog (Plans §07 §1). The body is mounted only while
 * the dialog is open, so its state (query, scope) starts fresh every time. On phones it fills the
 * screen.
 */
export function SearchPalette({
  open,
  onOpenChange,
  currentGame,
  returnFocusRef,
}: SearchPaletteProps) {
  // Opening a result navigates away, so focus then stays with the new page, not the old button.
  const navigated = useRef(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY_CLASS} />
        <DialogPrimitive.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!navigated.current) returnFocusRef?.current?.focus();
          }}
          className={cn(
            'dc-pop fixed z-50 flex flex-col overflow-hidden border-line bg-surface-1 shadow-card',
            // Phones: the whole screen. From sm: a centred panel near the top.
            'inset-0 h-dvh w-full',
            'sm:inset-auto sm:top-[10vh] sm:left-1/2 sm:h-auto sm:max-h-[min(40rem,80dvh)] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-panel sm:border-[1.5px]',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search the Codex</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to search weapons, armor, enchantments, mobs and more. Use the arrow keys to move
            through the results and Enter to open one.
          </DialogPrimitive.Description>
          <PaletteBody
            currentGame={currentGame}
            onClose={() => onOpenChange(false)}
            onNavigate={() => {
              navigated.current = true;
            }}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type Scope = 'game' | 'both';
type Loaded =
  | { key: string; flexes: FlexIndex[]; failed?: undefined }
  | { key: string; failed: true; flexes?: undefined };

function PaletteBody({
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
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [recent] = useState(getRecent);
  // Feedback for Ctrl/⌘+Enter. It lives inside the dialog: the page's toasts sit outside a modal
  // dialog, where they cannot be read by a screen reader or clicked.
  const [notice, setNotice] = useState<ToastOptions | null>(null);

  const games: readonly GameId[] = scope === 'game' && currentGame ? [currentGame] : GAME_IDS;
  const gamesKey = games.join(',');

  // Already loaded earlier in this page view: ready on the first render, no skeleton flash.
  const cached = games.map(peekFlex);
  const cachedAll = cached.every((f): f is FlexIndex => f !== undefined) ? cached : null;

  useEffect(() => {
    if (cachedAll) return;
    let cancelled = false;
    const wanted = gamesKey.split(',') as GameId[];
    Promise.all(wanted.map((g) => loadFlex(g))).then(
      (flexes) => {
        if (!cancelled) setLoaded({ key: gamesKey, flexes });
      },
      () => {
        if (!cancelled) setLoaded({ key: gamesKey, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
    // `cachedAll` only says whether to skip; `attempt` re-runs a failed load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gamesKey, attempt]);

  const flexes = cachedAll ?? (loaded?.key === gamesKey ? (loaded.flexes ?? null) : null);
  const failed = !flexes && loaded?.key === gamesKey && loaded.failed === true;

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
        <div
          role="alert"
          className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center"
        >
          <p className="font-display text-h3 font-extrabold text-text uppercase">
            Search could not load
          </p>
          <p className="max-w-sm text-muted">
            The search index did not download. Check your connection and try again.
          </p>
          <Button3D
            onClick={() => {
              setLoaded(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button3D>
        </div>
      ) : !flexes ? (
        <div role="status" className="flex flex-1 flex-col gap-2 p-3">
          <span className="sr-only">Loading search…</span>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-3 px-2 py-1">
              <Skeleton className="size-12 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : typed && resultCount === 0 ? (
        // Not inside the listbox: a listbox must hold options (axe aria-required-children).
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
          <p className="font-display text-h3 font-extrabold text-text uppercase">Nothing found</p>
          <p className="max-w-sm text-muted">
            No matches for “{text.trim()}”. Check the spelling, or try a shorter word.
          </p>
          {!both && currentGame && (
            <Button3D variant="stone" onClick={() => setScope('both')}>
              Search both games
            </Button3D>
          )}
        </div>
      ) : null}
      <Command.List
        hidden={!showOptions}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-pixel [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:tracking-pixel [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase"
      >
        {showOptions && (
          <>
            {typed ? (
              groups.map((group) => (
                <Command.Group
                  key={group.key}
                  heading={
                    both
                      ? `${getSection(group.game, group.category)?.label ?? group.category} · ${GAME_TAG[group.game]}`
                      : (getSection(group.game, group.category)?.label ?? group.category)
                  }
                >
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
            )}
          </>
        )}
      </Command.List>

      <div role="status" className="sr-only">
        {flexes && typed
          ? resultCount > 0
            ? `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`
            : 'No results'
          : ''}
      </div>

      {notice && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-4 py-2.5 text-sm sm:px-5"
        >
          <p className="min-w-0 flex-1 text-text">
            <strong>{notice.title}</strong>
            {notice.description && <span className="text-muted"> {notice.description}</span>}
          </p>
          {notice.action && (
            <Button3D
              size="sm"
              variant="stone"
              onClick={() => {
                notice.action?.onClick();
                setNotice({ title: 'Started a new comparison' });
              }}
            >
              {notice.action.label}
            </Button3D>
          )}
        </div>
      )}

      <div
        aria-hidden="true"
        className="flex items-center gap-4 border-t border-line px-5 py-2.5 font-pixel text-micro tracking-pixel text-muted uppercase pointer-coarse:hidden"
      >
        <span>↑↓ navigate</span>
        <span>↵ open</span>
        <span>Ctrl ↵ add to compare</span>
        <span>Esc close</span>
      </div>
    </Command>
  );
}

function ResultRow({
  entry,
  value,
  onSelect,
}: {
  entry: RecentEntry;
  value: string;
  onSelect: () => void;
}) {
  const rarity = RARITIES.find((r) => r === entry.r);
  const section = getSection(entry.g, entry.c);
  return (
    <Row
      value={value}
      icon={<RarityFrame size={48} rarity={rarity} src={entry.i} alt="" />}
      title={entry.n}
      subtitle={section?.label ?? entry.c}
      game={entry.g}
      onSelect={onSelect}
    />
  );
}

function Row({
  value,
  icon,
  title,
  subtitle,
  game,
  onSelect,
}: {
  value: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  game?: GameId;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-btn border-l-4 border-transparent px-2 py-1.5 text-text outline-none aria-selected:border-accent aria-selected:bg-surface-2"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{title}</span>
        <span className="block truncate text-sm text-muted">{subtitle}</span>
      </span>
      {game && (
        <Badge data-game={game} variant="dlc" aria-label={GAMES[game].name}>
          {GAME_TAG[game]}
        </Badge>
      )}
      <CornerDownLeft
        size={16}
        aria-hidden="true"
        className="shrink-0 text-muted opacity-0 group-aria-selected:opacity-100 pointer-coarse:hidden"
      />
    </Command.Item>
  );
}

type JumpTarget = {
  href: string;
  label: string;
  subtitle: string;
  game?: GameId;
  icon: ReactNode;
};

const iconOf = (entityId: string) => {
  const [game, category, slug] = entityId.split(':');
  return <RarityFrame size={48} src={`/images/${game}/${category}/${slug}.webp`} alt="" />;
};

/** The eight sections of the current game; on neutral pages the two game hubs. */
function jumpTargets(game?: GameId): JumpTarget[] {
  if (game) {
    return GAMES[game].categories.map((category) => {
      const section = getSection(game, category);
      return {
        href: `/${game}/${category}`,
        label: section?.label ?? category,
        subtitle: section?.description ?? '',
        game,
        icon: section ? iconOf(section.tileEntityId) : null,
      };
    });
  }
  return GAME_IDS.map((id) => ({
    href: `/${id}`,
    label: GAMES[id].name,
    subtitle: `${Object.keys(SECTIONS[id]).length} sections`,
    game: id,
    icon: iconOf(SECTIONS[id].weapons.tileEntityId),
  }));
}
