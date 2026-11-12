'use client';

import { Copy, CopyPlus, Save, Trash2 } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/features/planner/ConfirmDialog';
import { EnchantPicker } from '@/components/features/planner/EnchantPicker';
import { ItemPicker } from '@/components/features/planner/ItemPicker';
import { MyBuilds } from '@/components/features/planner/MyBuilds';
import { PlannerSlot } from '@/components/features/planner/PlannerSlot';
import { PlannerSummary } from '@/components/features/planner/PlannerSummary';
import { usePlannerData, type PlannerLoaded } from '@/components/features/planner/usePlannerData';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import type { GameId } from '@/config/games';
import { MAX_POWER } from '@/lib/forge/codec';
import type { Pick, Tier } from '@/lib/forge/enchantments';
import type { BuiltInRow } from '@/lib/forge/types';
import { decodeBuild, describeDropped, encodeBuild } from '@/lib/planner/codec';
import { MAX_NAME, MAX_NOTES, emptyBuild, type Build } from '@/lib/planner/schema';
import { getSlot, slotsFor, type SlotCategory } from '@/lib/planner/slots';
import {
  DEFAULT_BUILD_NAME,
  deleteBuild,
  draftStore,
  renameBuild,
  saveBuild,
  setDraft,
  useDraft,
  useSavedBuilds,
  type SavedBuild,
} from '@/lib/planner/store';
import { DEFAULT_POWER, summarize } from '@/lib/planner/summary';
import { useHydrated } from '@/lib/storage/useHydrated';

const GROUPS: Record<SlotCategory, string> = {
  weapons: 'Weapons',
  armor: 'Armor',
  artifacts: 'Artifacts',
  talismans: 'Talismans',
};

const FIELD =
  'min-h-11 rounded-sm border border-control bg-surface-2 px-3 text-text placeholder:text-muted hover:border-accent';

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
  const { data, catalog, catalogBySlug, known } = loaded;
  const { toast } = useToast();
  const nameId = useId();
  const powerId = useId();
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

  const summary = useMemo(
    () => summarize(build, data, catalogBySlug),
    [build, data, catalogBySlug],
  );
  const enchantName = (slug: string) => catalogBySlug.get(slug)?.name ?? slug;

  // --- dialogs ---
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [enchantKey, setEnchantKey] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const pickerSlot = pickerKey ? getSlot(game, pickerKey) : undefined;
  const enchantSlot = enchantKey ? getSlot(game, enchantKey) : undefined;

  // The dialogs have no trigger element Radix could return focus to, so do it here.
  const refocus = (key: string, selector: string) =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-testid="slot-${key}"] ${selector}`)?.focus(),
    );

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
  const [powerDraft, setPowerDraft] = useState<string | null>(null);
  const changePower = (text: string) => {
    setPowerDraft(text);
    const value = Number.parseInt(text, 10);
    if (Number.isFinite(value)) {
      commit({ ...build, power: Math.min(MAX_POWER, Math.max(1, value)) });
    }
  };

  // --- actions ---
  const shareUrl = (code: string) =>
    `${window.location.origin}/${game}/planner?b=${encodeURIComponent(code)}`;
  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(code));
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
      toast({
        title: 'My builds holds up to 50.',
        description: 'Delete one first.',
        variant: 'error',
      });
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
      toast({
        title: 'My builds holds up to 50.',
        description: 'Delete one first.',
        variant: 'error',
      });
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

  const builtInsOf = (key: string): BuiltInRow[] => {
    const slot = getSlot(game, key);
    const choice = build.slots[key];
    const item = slot && choice && data.item(slot.category, choice.slug);
    const list = (item?.builtInEnchantments ?? []) as { enchantmentId: string }[];
    return list.flatMap(({ enchantmentId }) => {
      const slug = enchantmentId.split(':')[2] ?? '';
      const enchantment = catalogBySlug.get(slug);
      return enchantment
        ? [
            {
              slug,
              name: enchantment.name,
              href: `/${game}/enchantments/${slug}`,
              ...(enchantment.image ? { image: enchantment.image } : {}),
            },
          ]
        : [];
    });
  };

  const groups = [...new Set(slotsFor(game).map((slot) => slot.category))];

  return (
    <div className="flex flex-col gap-8" data-testid="build-planner">
      {/* name, power and actions */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <label htmlFor={nameId} className="text-sm font-semibold text-text">
            Build name
          </label>
          <input
            id={nameId}
            value={build.name ?? ''}
            maxLength={MAX_NAME}
            placeholder="Name your build"
            onChange={(event) => commit(withText('name', event.target.value))}
            className={FIELD}
          />
        </div>
        {game === 'd1' && (
          <div className="flex flex-col gap-1">
            <label htmlFor={powerId} className="text-sm font-semibold text-text">
              Power
            </label>
            <input
              id={powerId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_POWER}
              value={powerDraft ?? String(build.power ?? DEFAULT_POWER)}
              onChange={(event) => changePower(event.target.value)}
              onBlur={() => setPowerDraft(null)}
              className={`${FIELD} w-28`}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button3D size="sm" onClick={copyCurrent} icon={<Copy size={16} aria-hidden="true" />}>
            Copy link
          </Button3D>
          <Button3D
            size="sm"
            variant="gold"
            onClick={save}
            icon={<Save size={16} aria-hidden="true" />}
          >
            Save
          </Button3D>
          <Button3D
            size="sm"
            variant="stone"
            onClick={duplicate}
            icon={<CopyPlus size={16} aria-hidden="true" />}
          >
            Duplicate
          </Button3D>
          <Button3D
            size="sm"
            variant="stone"
            onClick={() => setConfirmClear(true)}
            icon={<Trash2 size={16} aria-hidden="true" />}
          >
            Clear
          </Button3D>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Panel padding="md" className="flex flex-col gap-6" aria-label="Gear">
          <h3 className="m-0 font-display text-h3 font-extrabold text-text uppercase">Gear</h3>
          {groups.map((category) => (
            <section key={category} aria-label={GROUPS[category]} className="flex flex-col gap-3">
              <h4 className="m-0 text-sm font-bold text-muted">{GROUPS[category]}</h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                {slotsFor(game)
                  .filter((slot) => slot.category === category)
                  .map((slot) => {
                    const choice = build.slots[slot.key];
                    return (
                      <PlannerSlot
                        key={slot.key}
                        game={game}
                        slot={slot}
                        choice={choice}
                        item={choice && data.item(slot.category, choice.slug)}
                        enchantName={enchantName}
                        onChoose={() => setPickerKey(slot.key)}
                        onEnchant={() => setEnchantKey(slot.key)}
                        onRemove={() => commit(withSlot(slot.key, undefined))}
                        onTier={(tier) => setTier(slot.key, tier)}
                      />
                    );
                  })}
              </div>
            </section>
          ))}
        </Panel>
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
        onOpen={openSaved}
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
        onCopy={(saved) => void copyLink(saved.code)}
      />

      {pickerSlot && (
        <ItemPicker
          slot={pickerSlot}
          data={data}
          open
          onOpenChange={(open) => {
            if (open) return;
            setPickerKey(null);
            refocus(pickerSlot.key, 'button');
          }}
          selectedSlug={build.slots[pickerSlot.key]?.slug}
          onSelect={(slug) => setItem(pickerSlot.key, slug)}
        />
      )}
      {enchantSlot && build.slots[enchantSlot.key] && (
        <EnchantPicker
          slot={enchantSlot}
          itemName={
            data.item(enchantSlot.category, build.slots[enchantSlot.key]?.slug ?? '')?.name ?? ''
          }
          catalog={catalog}
          picks={build.slots[enchantSlot.key]?.picks ?? []}
          builtIns={builtInsOf(enchantSlot.key)}
          open
          onOpenChange={(open) => {
            if (open) return;
            setEnchantKey(null);
            refocus(enchantSlot.key, 'button[aria-label^="Enchant "]');
          }}
          onChange={(picks) => setPicks(enchantSlot.key, picks)}
        />
      )}
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear this build?"
        description="Every item, enchantment, the name and the notes are removed. Builds saved in My builds are not affected."
        confirmLabel="Clear build"
        onConfirm={clear}
      />
    </div>
  );
}
