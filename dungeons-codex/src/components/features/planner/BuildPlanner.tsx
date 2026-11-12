'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/features/planner/ConfirmDialog';
import { MyBuilds } from '@/components/features/planner/MyBuilds';
import { FIELD, PlannerHeader } from '@/components/features/planner/PlannerHeader';
import { PlannerGear } from '@/components/features/planner/PlannerGear';
import { PlannerPickers } from '@/components/features/planner/PlannerPickers';
import { PlannerSummary } from '@/components/features/planner/PlannerSummary';
import { usePlannerActions } from '@/components/features/planner/usePlannerActions';
import { usePlannerData, type PlannerLoaded } from '@/components/features/planner/usePlannerData';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { GameId } from '@/config/games';
import type { Pick, Tier } from '@/lib/forge/enchantments';
import { decodeBuild, describeDropped, encodeBuild } from '@/lib/planner/codec';
import { MAX_NAME, MAX_NOTES, emptyBuild, type Build } from '@/lib/planner/schema';
import { getSlot } from '@/lib/planner/slots';
import {
  DEFAULT_BUILD_NAME,
  deleteBuild,
  draftStore,
  renameBuild,
  setDraft,
  useDraft,
  useSavedBuilds,
} from '@/lib/planner/store';
import { summarize } from '@/lib/planner/summary';
import { useHydrated } from '@/lib/storage/useHydrated';

const isBlank = (build: Build) =>
  Object.keys(build.slots).length === 0 && !build.name && !build.notes && build.power === undefined;

/** The height of the finished planner, so nothing jumps when it loads. */
export function PlannerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the planner" className="flex flex-col gap-6">
      <Skeleton className="h-12 w-full max-w-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[34rem] rounded-panel" />
        <Skeleton className="h-80 rounded-panel" />
      </div>
    </div>
  );
}

/**
 * The Build Planner (Plans §07 §5, Wireframes §6). A static page hands over the game; the build
 * lives in `?b=` (a share link) and in this browser's draft (`dc:planner-draft:{game}`), and the
 * data it needs is fetched when the planner mounts (D-096).
 */
export function BuildPlanner({ game }: { game: GameId }) {
  const hydrated = useHydrated();
  const loaded = usePlannerData(game);
  if (!hydrated || loaded.status === 'loading') return <PlannerSkeleton />;
  if (loaded.status === 'error') {
    return (
      <EmptyState
        title="Could not load the planner data"
        text="Check your connection and try again."
        action={<Button3D onClick={loaded.retry}>Try again</Button3D>}
      />
    );
  }
  return <PlannerEditor game={game} loaded={loaded} />;
}

function PlannerEditor({ game, loaded }: { game: GameId; loaded: PlannerLoaded }) {
  const { data, catalogBySlug, known } = loaded;
  const { toast } = useToast();
  const notesId = useId();

  const [urlCode, setUrlCode] = useQueryState(
    'b',
    parseAsString.withOptions({ history: 'replace' }),
  );
  const draft = useDraft(game);
  const savedBuilds = useSavedBuilds();
  const mine = useMemo(() => savedBuilds.filter((b) => b.game === game), [savedBuilds, game]);

  const fromUrl = useMemo(
    () => (urlCode ? decodeBuild(urlCode, game, known) : undefined),
    [urlCode, game, known],
  );
  const fromDraft = useMemo(
    () => (draft.code ? decodeBuild(draft.code, game, known) : undefined),
    [draft.code, game, known],
  );
  const build = (fromUrl ?? fromDraft)?.build ?? emptyBuild(game);
  // The saved build being edited: only known while the working copy is the draft.
  const savedId = fromUrl ? (urlCode === draft.code ? draft.savedId : undefined) : draft.savedId;

  // A shared link: say what could not be read or no longer exists, once per link.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!urlCode || reported.current === urlCode) return;
    reported.current = urlCode;
    if (!fromUrl) {
      toast({
        title: 'That build link could not be read',
        description: draft.code
          ? 'It may be damaged or belong to the other game. Your last build is shown instead.'
          : 'It may be damaged or belong to the other game.',
        variant: 'error',
        duration: 7000,
      });
      void setUrlCode(null);
    } else if (fromUrl.dropped.length > 0) {
      toast({
        title: 'Some entries were left out',
        description: describeDropped(fromUrl.dropped),
        duration: 8000,
      });
    }
  }, [urlCode, fromUrl, draft.code, toast, setUrlCode]);

  const commit = (next: Build, id: string | undefined = savedId) => {
    setDraft(draftStore(game), next, id);
    void setUrlCode(isBlank(next) ? null : encodeBuild(next));
  };
  const actions = usePlannerActions({ game, build, savedId, known, commit });

  const summary = useMemo(
    () => summarize(build, data, catalogBySlug),
    [build, data, catalogBySlug],
  );
  const enchantName = (slug: string) => catalogBySlug.get(slug)?.name ?? slug;

  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [enchantKey, setEnchantKey] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // --- edits ---
  const withSlot = (key: string, choice: Build['slots'][string] | undefined): Build => {
    const others = Object.entries(build.slots).filter(([k]) => k !== key);
    return { ...build, slots: Object.fromEntries(choice ? [...others, [key, choice]] : others) };
  };
  const setItem = (key: string, slug: string) => {
    const slot = getSlot(game, key);
    const existing = build.slots[key];
    if (!slot) return;
    commit(
      withSlot(key, {
        slug,
        picks: existing?.picks ?? [],
        ...(slot.tiered ? { tier: existing?.tier ?? 1 } : {}),
      }),
    );
  };
  const setPicks = (key: string, picks: Pick[]) => {
    const existing = build.slots[key];
    if (existing) commit(withSlot(key, { ...existing, picks }));
  };
  const setTier = (key: string, tier: Tier) => {
    const existing = build.slots[key];
    if (existing) commit(withSlot(key, { ...existing, tier }));
  };
  const withText = (field: 'name' | 'notes', value: string): Build => {
    const rest = { ...build, [field]: value || undefined };
    // An empty text is left out entirely (the codec and the draft expect absent, not empty).
    return Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== undefined),
    ) as unknown as Build;
  };

  return (
    <div className="flex flex-col gap-8" data-testid="build-planner">
      <PlannerHeader
        game={game}
        build={build}
        onChange={commit}
        onName={(value) => commit(withText('name', value))}
        onCopyLink={actions.copyCurrent}
        onSave={actions.save}
        onDuplicate={actions.duplicate}
        onClear={() => setConfirmClear(true)}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <PlannerGear
          game={game}
          build={build}
          data={data}
          enchantName={enchantName}
          onChoose={setPickerKey}
          onEnchant={setEnchantKey}
          onRemove={(key) => commit(withSlot(key, undefined))}
          onTier={setTier}
        />
        <div className="lg:sticky lg:top-24">
          <PlannerSummary game={game} summary={summary} />
        </div>
      </div>

      <div className="flex max-w-3xl flex-col gap-1">
        <label htmlFor={notesId} className="text-sm font-semibold text-text">
          Notes <span className="font-normal text-muted">(optional, {MAX_NOTES} characters)</span>
        </label>
        <textarea
          id={notesId}
          rows={2}
          maxLength={MAX_NOTES}
          value={build.notes ?? ''}
          onChange={(event) => commit(withText('notes', event.target.value))}
          className={`${FIELD} py-2`}
        />
      </div>

      <MyBuilds
        builds={mine}
        currentId={savedId}
        onOpen={actions.openSaved}
        onRename={(id, name) => {
          renameBuild(id, name);
          const renamed = id === savedId;
          if (renamed)
            commit({ ...build, name: name.trim().slice(0, MAX_NAME) || DEFAULT_BUILD_NAME });
        }}
        onDelete={(id) => {
          deleteBuild(id);
          if (id === savedId) setDraft(draftStore(game), build, undefined);
          toast({ title: 'Build deleted' });
        }}
        onCopy={(saved) => void actions.copyLink(saved.code)}
      />

      <PlannerPickers
        game={game}
        build={build}
        loaded={loaded}
        pickerKey={pickerKey}
        enchantKey={enchantKey}
        onClosePicker={() => setPickerKey(null)}
        onCloseEnchant={() => setEnchantKey(null)}
        onItem={setItem}
        onPicks={setPicks}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear this build?"
        description="Every item, enchantment, the name and the notes are removed. Builds saved in My builds are not affected."
        confirmLabel="Clear build"
        onConfirm={actions.clear}
      />
    </div>
  );
}
