'use client';

import { Copy, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { ConfirmDialog } from '@/components/features/planner/ConfirmDialog';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/Dialog';
import { Panel } from '@/components/ui/Panel';
import { MAX_NAME } from '@/lib/planner/schema';
import { MAX_BUILDS, type SavedBuild } from '@/lib/planner/store';

const date = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const ICON =
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-semibold text-accent-text hover:bg-surface-2';

/**
 * "My builds": the builds saved in this browser (`dc:builds:v1`, at most 50) with open, rename,
 * copy link and delete (after a confirmation).
 */
export function MyBuilds({
  builds,
  currentId,
  onOpen,
  onRename,
  onDelete,
  onCopy,
}: {
  builds: readonly SavedBuild[];
  /** The saved build being edited. */
  currentId: string | undefined;
  onOpen: (build: SavedBuild) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCopy: (build: SavedBuild) => void;
}) {
  const [renaming, setRenaming] = useState<SavedBuild | null>(null);
  const [deleting, setDeleting] = useState<SavedBuild | null>(null);
  return (
    <section aria-labelledby="my-builds-heading" data-testid="my-builds">
      <Panel padding="md" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="my-builds-heading"
            className="m-0 font-display text-h3 font-extrabold text-text uppercase"
          >
            My builds
          </h3>
          <p className="m-0 text-sm text-muted">
            {builds.length} of {MAX_BUILDS} · saved in this browser only
          </p>
        </div>
        {builds.length === 0 ? (
          <p className="m-0 text-muted">
            Nothing saved yet. Use Save to keep a build here, or Copy link to share it.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {builds.map((build) => (
              <li
                key={build.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate font-bold text-text">
                    {build.name}
                    {build.id === currentId && (
                      <span className="ml-2 font-pixel text-micro tracking-pixel text-accent-text uppercase">
                        Open
                      </span>
                    )}
                  </p>
                  <p className="m-0 text-xs text-muted">
                    Saved {date.format(new Date(build.savedAt))}
                  </p>
                </div>
                <div className="flex flex-wrap">
                  <button
                    type="button"
                    className={ICON}
                    onClick={() => onOpen(build)}
                    aria-label={`Open ${build.name}`}
                  >
                    <FolderOpen size={16} aria-hidden="true" />
                    Open
                  </button>
                  <button
                    type="button"
                    className={ICON}
                    onClick={() => setRenaming(build)}
                    aria-label={`Rename ${build.name}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Rename
                  </button>
                  <button
                    type="button"
                    className={ICON}
                    onClick={() => onCopy(build)}
                    aria-label={`Copy link to ${build.name}`}
                  >
                    <Copy size={16} aria-hidden="true" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className={ICON}
                    onClick={() => setDeleting(build)}
                    aria-label={`Delete ${build.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <RenameDialog
        build={renaming}
        onClose={() => setRenaming(null)}
        onRename={(name) => renaming && onRename(renaming.id, name)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this build?"
        description={`“${deleting?.name ?? ''}” is removed from this browser. A link you already copied still works.`}
        confirmLabel="Delete build"
        onConfirm={() => deleting && onDelete(deleting.id)}
      />
    </section>
  );
}

function RenameDialog({
  build,
  onClose,
  onRename,
}: {
  build: SavedBuild | null;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  return (
    <Dialog open={build !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Rename build" className="max-w-md">
        {build && <RenameForm key={build.id} build={build} onRename={onRename} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  build,
  onRename,
  onClose,
}: {
  build: SavedBuild;
  onRename: (name: string) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(build.name);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onRename(name);
        onClose();
      }}
    >
      <label htmlFor={id} className="text-sm font-semibold text-text">
        Name
      </label>
      <input
        id={id}
        value={name}
        maxLength={MAX_NAME}
        onChange={(event) => setName(event.target.value)}
        className="min-h-11 rounded-sm border border-control bg-surface-2 px-3 text-text"
      />
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button3D variant="stone">Cancel</Button3D>
        </DialogClose>
        <Button3D type="submit">Rename</Button3D>
      </div>
    </form>
  );
}
