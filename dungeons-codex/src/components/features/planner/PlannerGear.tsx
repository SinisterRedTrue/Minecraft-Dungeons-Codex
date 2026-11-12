import { PlannerSlot } from '@/components/features/planner/PlannerSlot';
import type { PlannerLoaded } from '@/components/features/planner/usePlannerData';
import { Panel } from '@/components/ui/Panel';
import type { GameId } from '@/config/games';
import type { Tier } from '@/lib/forge/enchantments';
import type { Build } from '@/lib/planner/schema';
import { slotsFor, type SlotCategory } from '@/lib/planner/slots';

const GROUPS: Record<SlotCategory, string> = {
  weapons: 'Weapons',
  armor: 'Armor',
  artifacts: 'Artifacts',
  talismans: 'Talismans',
};

/** The gear panel: every slot of the game, grouped by category. */
export function PlannerGear({
  game,
  build,
  data,
  enchantName,
  onChoose,
  onEnchant,
  onRemove,
  onTier,
}: {
  game: GameId;
  build: Build;
  data: PlannerLoaded['data'];
  enchantName: (slug: string) => string;
  onChoose: (key: string) => void;
  onEnchant: (key: string) => void;
  onRemove: (key: string) => void;
  onTier: (key: string, tier: Tier) => void;
}) {
  const groups = [...new Set(slotsFor(game).map((slot) => slot.category))];
  return (
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
                    onChoose={() => onChoose(slot.key)}
                    onEnchant={() => onEnchant(slot.key)}
                    onRemove={() => onRemove(slot.key)}
                    onTier={(tier) => onTier(slot.key, tier)}
                  />
                );
              })}
          </div>
        </section>
      ))}
    </Panel>
  );
}
