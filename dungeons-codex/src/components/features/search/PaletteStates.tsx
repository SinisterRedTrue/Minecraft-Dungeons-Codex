import { Button3D } from '@/components/ui/Button3D';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ToastOptions } from '@/components/ui/Toast';

/** The index did not download. */
export function PaletteError({ onRetry }: { onRetry: () => void }) {
  return (
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
      <Button3D onClick={onRetry}>Try again</Button3D>
    </div>
  );
}

export function PaletteLoading() {
  return (
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
  );
}

/** Not inside the listbox: a listbox must hold options (axe aria-required-children). */
export function PaletteEmpty({
  query,
  onSearchBoth,
}: {
  query: string;
  /** Offered when only one game was searched. */
  onSearchBoth?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <p className="font-display text-h3 font-extrabold text-text uppercase">Nothing found</p>
      <p className="max-w-sm text-muted">
        No matches for “{query}”. Check the spelling, or try a shorter word.
      </p>
      {onSearchBoth && (
        <Button3D variant="stone" onClick={onSearchBoth}>
          Search both games
        </Button3D>
      )}
    </div>
  );
}

/** Feedback for Ctrl/⌘+Enter, kept inside the dialog where a screen reader and a click can reach it. */
export function PaletteNotice({
  notice,
  onAction,
}: {
  notice: ToastOptions;
  onAction: () => void;
}) {
  return (
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
            onAction();
          }}
        >
          {notice.action.label}
        </Button3D>
      )}
    </div>
  );
}

export function PaletteFooter() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-4 border-t border-line px-5 py-2.5 font-pixel text-micro tracking-pixel text-muted uppercase pointer-coarse:hidden"
    >
      <span>↑↓ navigate</span>
      <span>↵ open</span>
      <span>Ctrl ↵ add to compare</span>
      <span>Esc close</span>
    </div>
  );
}
