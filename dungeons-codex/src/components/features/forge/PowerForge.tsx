'use client';

import { Gem, RotateCcw, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { catalogMap } from '@/lib/forge/catalog';
import { decodeForge, encodeForge } from '@/lib/forge/codec';
import { damageAt, healthAt } from '@/lib/forge/damage';
import { applyEnchantments, enchantmentsFor, type Pick, type Tier } from '@/lib/forge/enchantments';
import { pointsUsed } from '@/lib/forge/points';
import type { ForgeProps } from '@/lib/forge/types';
import { BuiltInRowView, EnchantmentSlot } from './EnchantmentSlot';
import { ForgeResult } from './ForgeResult';
import { NumberTicker } from './NumberTicker';
import { PowerLevelControl } from './PowerLevelControl';
import { useCatalog } from './useCatalog';

const DEFAULT_POWER = 100;

/** The state a `?forge=` link on the current page holds (the component only renders in a browser). */
function initialState(slots: number, hasPower: boolean) {
  const decoded = decodeForge(new URLSearchParams(window.location.search).get('forge'));
  return {
    power: hasPower ? (decoded?.power ?? DEFAULT_POWER) : DEFAULT_POWER,
    picks: (decoded?.picks ?? []).slice(0, slots),
  };
}

/**
 * The Power Forge (Plans §07 §2): move the power slider, pick enchantments with their tiers and
 * watch the numbers update. Everything shown comes from the item's own wiki table or is badged
 * Approximate. Loaded lazily (`ForgeLoader`), only on weapon and armor detail pages.
 */
export default function PowerForge({ props }: { props: ForgeProps }) {
  const { game, category, target, slots, item } = props;
  const hasPower = item !== undefined;
  const { toast } = useToast();
  const { state: catalogState, retry } = useCatalog(game);

  const [initial] = useState(() => initialState(slots, hasPower));
  const [power, setPower] = useState(initial.power);
  const [resetKey, setResetKey] = useState(0);
  const [picks, setPicks] = useState<Pick[]>(initial.picks);

  const catalog = catalogState.status === 'ready' ? catalogState.list : undefined;
  const bySlug = useMemo(() => catalogMap(catalog ?? []), [catalog]);
  const options = useMemo(() => enchantmentsFor(catalog ?? [], target), [catalog, target]);

  // Picks from a link may name enchantments that do not exist or do not fit: ignore those.
  const valid = useMemo(
    () => (catalog ? picks.filter((p) => options.some((o) => o.slug === p.slug)) : []),
    [catalog, picks, options],
  );

  const base = useMemo(
    () =>
      item ? (category === 'weapons' ? damageAt(item, power) : healthAt(item, power)) : undefined,
    [item, category, power],
  );
  const applied = useMemo(
    () => applyEnchantments(base ?? { min: 0, max: 0 }, valid, bySlug),
    [base, valid, bySlug],
  );
  const points = useMemo(() => pointsUsed(valid, bySlug), [valid, bySlug]);
  const boosted =
    category === 'weapons' && base
      ? { min: applied.min, max: applied.max, multiplier: applied.multiplier }
      : undefined;

  const takenIn = useMemo(() => new Map(valid.map((p, i) => [p.slug, `Slot ${i + 1}`])), [valid]);

  const select = (index: number, slug: string) => {
    const next = [...valid];
    const current = next[index];
    if (current) next[index] = { slug, tier: current.tier };
    else next.push({ slug, tier: 1 });
    setPicks(next);
  };
  const setTier = (index: number, tier: Tier) =>
    setPicks(valid.map((p, i) => (i === index ? { ...p, tier } : p)));
  const remove = (index: number) => setPicks(valid.filter((_, i) => i !== index));

  const reset = () => {
    setPower(DEFAULT_POWER);
    setResetKey((n) => n + 1);
    setPicks([]);
    const url = new URL(window.location.href);
    url.searchParams.delete('forge');
    window.history.replaceState(null, '', url);
    toast({ title: 'Forge reset', variant: 'default' });
  };

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set(
      'forge',
      encodeForge({ power: hasPower ? power : undefined, picks: valid }),
    );
    url.hash = 'forge';
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast({
        title: 'Link copied',
        description: 'Anyone who opens it sees this setup.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: 'The address bar now holds it: copy it from there.',
        variant: 'error',
      });
    }
  };

  return (
    <SectionBlock id="forge" title="Power Forge">
      <Panel padding="md" className="@container" data-testid="power-forge">
        <div className="grid gap-6 @2xl:grid-cols-2 @2xl:gap-8">
          {/* ── controls ───────────────────────────────────────────────────────────── */}
          <div className="@container flex min-w-0 flex-col gap-5">
            {hasPower && <PowerLevelControl key={resetKey} power={power} onChange={setPower} />}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-sm font-semibold text-text">Enchantments</h3>
                {game === 'd1' && (
                  <span
                    className="inline-flex items-center gap-1.5 font-pixel text-sm tracking-pixel text-text"
                    title="Tier costs add up: reaching tier III costs I + II + III."
                    data-testid="forge-points"
                  >
                    <Gem size={16} className="text-soul-text" aria-hidden="true" />
                    <span className="sr-only">Enchantment points used: </span>
                    <NumberTicker value={points} format={(n) => String(Math.round(n))} />
                    <span aria-hidden="true" className="text-muted">
                      pts
                    </span>
                  </span>
                )}
              </div>

              {props.builtIns.length > 0 && (
                <ul
                  aria-label="Built-in enchantments"
                  className="m-0 flex list-none flex-col gap-2 p-0"
                >
                  {props.builtIns.map((row) => (
                    <BuiltInRowView key={row.slug} row={row} />
                  ))}
                </ul>
              )}

              {catalogState.status === 'loading' && (
                <div
                  className="flex flex-col gap-2"
                  role="status"
                  aria-label="Loading enchantments"
                >
                  {Array.from({ length: slots }, (_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </div>
              )}
              {catalogState.status === 'error' && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-text">
                  <span>The enchantment list could not be loaded.</span>
                  <Button3D size="sm" variant="stone" onClick={retry}>
                    Try again
                  </Button3D>
                </div>
              )}
              {catalog && (
                <ul
                  aria-label="Enchantment slots"
                  className="m-0 flex list-none flex-col gap-2 p-0"
                >
                  {Array.from({ length: slots }, (_, i) => (
                    <EnchantmentSlot
                      key={i}
                      index={i}
                      options={options}
                      pick={valid[i]}
                      takenIn={takenIn}
                      onSelect={(slug) => select(i, slug)}
                      onTier={(tier) => setTier(i, tier)}
                      onRemove={() => remove(i)}
                    />
                  ))}
                </ul>
              )}
              <p className="m-0 text-xs text-muted">
                In the game you pick one of three enchantments per row; the Forge simplifies this to
                one pick per slot.
                {props.builtIns.length > 0 &&
                  ' Built-in enchantments cannot be changed, and their tier is not documented, so they never change the numbers.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button3D
                variant="stone"
                size="sm"
                icon={<RotateCcw size={16} aria-hidden="true" />}
                onClick={reset}
              >
                Reset
              </Button3D>
              <Button3D size="sm" icon={<Share2 size={16} aria-hidden="true" />} onClick={share}>
                Share
              </Button3D>
            </div>
          </div>

          {/* ── result ─────────────────────────────────────────────────────────────── */}
          <div className="min-w-0 rounded-card border border-line bg-surface-2 p-4 @2xl:p-5">
            <ForgeResult
              props={props}
              power={power}
              base={base}
              boosted={boosted}
              lines={applied.lines}
            />
          </div>
        </div>
      </Panel>
    </SectionBlock>
  );
}
