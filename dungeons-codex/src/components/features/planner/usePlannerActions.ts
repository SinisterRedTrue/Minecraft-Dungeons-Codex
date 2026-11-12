import { useToast } from '@/components/ui/Toast';
import type { GameId } from '@/config/games';
import { decodeBuild, describeDropped, encodeBuild, type Known } from '@/lib/planner/codec';
import { MAX_NAME, emptyBuild, type Build } from '@/lib/planner/schema';
import {
  DEFAULT_BUILD_NAME,
  draftStore,
  saveBuild,
  setDraft,
  type SavedBuild,
} from '@/lib/planner/store';

const FULL = {
  title: 'My builds holds up to 50.',
  description: 'Delete one first.',
  variant: 'error',
} as const;

/** Copy link, Save, Duplicate, Clear and Open for the planner; every one reports with a toast. */
export function usePlannerActions({
  game,
  build,
  savedId,
  known,
  commit,
}: {
  game: GameId;
  build: Build;
  savedId: string | undefined;
  known: Known;
  commit: (next: Build, id?: string) => void;
}) {
  const { toast } = useToast();

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${game}/planner?b=${encodeURIComponent(code)}`,
      );
      toast({
        title: 'Link copied',
        description: 'Anyone who opens it sees this build.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: 'Copy the address from your browser instead.',
        variant: 'error',
      });
    }
  };

  const copyCurrent = () => {
    if (Object.keys(build.slots).length === 0) {
      toast({ title: 'Nothing to share yet', description: 'Choose some items first.' });
      return;
    }
    void copyLink(encodeBuild(build));
  };

  const save = () => {
    const result = saveBuild(build, savedId);
    if (!result.ok) {
      toast(FULL);
      return;
    }
    setDraft(draftStore(game), build, result.saved.id);
    toast({ title: 'Saved to My builds', description: result.saved.name, variant: 'success' });
  };

  const duplicate = () => {
    const base = build.name || DEFAULT_BUILD_NAME;
    const copy: Build = { ...build, name: `${base} copy`.slice(0, MAX_NAME) };
    const result = saveBuild(copy);
    if (!result.ok) {
      toast(FULL);
      return;
    }
    commit(copy, result.saved.id);
    toast({ title: 'Duplicated', description: `Now editing “${copy.name}”.`, variant: 'success' });
  };

  const clear = () => {
    commit(emptyBuild(game), undefined);
    toast({ title: 'Build cleared' });
  };

  const openSaved = (saved: SavedBuild) => {
    const decoded = decodeBuild(saved.code, game, known);
    if (!decoded) {
      toast({ title: 'That saved build could not be read', variant: 'error' });
      return;
    }
    commit(decoded.build, saved.id);
    if (decoded.dropped.length > 0) {
      toast({ title: 'Some entries were left out', description: describeDropped(decoded.dropped) });
    }
  };

  return { copyLink, copyCurrent, save, duplicate, clear, openSaved };
}
