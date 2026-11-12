'use client';

import { Download, Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/Dialog';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { useToast } from '@/components/ui/Toast';
import { GAME_IDS } from '@/config/games';
import { backupSchema } from '@/lib/favorites/backup';
import { importFavorites, useFavorites } from '@/lib/favorites/store';
import { loadIndex } from '@/lib/search/loadIndex';

const BACKUP_FILE_NAME = 'dungeons-codex-favorites.json';

/** The ids in `ids` that exist in the current data; all of them when the index cannot be loaded. */
async function knownIds(ids: readonly string[]): Promise<{ known: string[]; skipped: number }> {
  try {
    const indexes = await Promise.all(GAME_IDS.map((g) => loadIndex(g)));
    const all = new Set(indexes.flat().map((e) => e.id));
    const known = ids.filter((id) => all.has(id));
    return { known, skipped: ids.length - known.length };
  } catch {
    return { known: [...ids], skipped: 0 };
  }
}

/**
 * The "Backup" menu of the Favorites page: Export downloads `dungeons-codex-favorites.json`;
 * Import reads such a file (validated with Zod), then asks whether to merge it into or replace the
 * current list. Nothing leaves the browser.
 */
export function BackupMenu() {
  const { toast } = useToast();
  const favorites = useFavorites();
  const fileInput = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [pending, setPending] = useState<{ ids: string[]; skipped: number } | null>(null);

  function exportFile() {
    const body = JSON.stringify({ version: 1, favorites }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = BACKUP_FILE_NAME;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Favorites exported', variant: 'success', description: BACKUP_FILE_NAME });
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // the same file can be chosen again
    if (!file) return;
    const fail = () =>
      toast({
        title: 'That file is not a favorites backup',
        description: `Choose a ${BACKUP_FILE_NAME} exported from Dungeons Codex.`,
        variant: 'error',
      });
    let parsed: ReturnType<typeof backupSchema.safeParse>;
    try {
      parsed = backupSchema.safeParse(JSON.parse(await file.text()));
    } catch {
      return fail();
    }
    if (!parsed.success) return fail();
    const list = Array.isArray(parsed.data) ? parsed.data : parsed.data.favorites;
    const { known, skipped } = await knownIds([...new Set(list)]);
    setPending({ ids: known, skipped });
  }

  function apply(mode: 'merge' | 'replace') {
    if (!pending) return;
    importFavorites(pending.ids, mode);
    toast({
      title: mode === 'merge' ? 'Favorites merged' : 'Favorites replaced',
      description: `${pending.ids.length} imported.`,
      variant: 'success',
    });
    setPending(null);
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button3D variant="stone" icon={<Download size={18} aria-hidden="true" />}>
            Backup
          </Button3D>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <p className="px-2 pt-1 pb-2 text-sm text-muted">
            Favorites live in this browser. Save them to a file or load them on another device.
          </p>
          <PopoverClose asChild>
            <button
              type="button"
              onClick={exportFile}
              disabled={favorites.length === 0}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-btn px-3 text-left text-sm font-semibold text-text hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={18} aria-hidden="true" />
              Export JSON
            </button>
          </PopoverClose>
          <PopoverClose asChild>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-btn px-3 text-left text-sm font-semibold text-text hover:bg-surface-2"
            >
              <Upload size={18} aria-hidden="true" />
              Import JSON…
            </button>
          </PopoverClose>
        </PopoverContent>
      </Popover>
      <input
        ref={fileInput}
        id={inputId}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        aria-label="Import favorites file"
        className="sr-only"
        tabIndex={-1}
      />

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent
          title="Import favorites"
          description={
            pending
              ? `${pending.ids.length} ${pending.ids.length === 1 ? 'item' : 'items'} found in the file${
                  pending.skipped > 0
                    ? ` (${pending.skipped} not in the current data were skipped)`
                    : ''
                }.`
              : undefined
          }
        >
          <p className="text-sm text-muted">
            Merge keeps your {favorites.length} current favorites and adds these. Replace swaps your
            list for the file’s.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button3D onClick={() => apply('merge')}>Merge</Button3D>
            <Button3D variant="redstone" onClick={() => apply('replace')}>
              Replace
            </Button3D>
            <DialogClose asChild>
              <Button3D variant="ghost">Cancel</Button3D>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
