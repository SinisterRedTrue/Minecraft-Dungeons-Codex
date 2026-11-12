import type { ReactNode } from 'react';
import { ForgeSlot } from '@/components/features/forge/ForgeSlot';
import type { DetailData } from '@/lib/detail/context';
import { formatField } from '@/components/entity/format';
import { ArmorSetSection } from './ArmorSetSection';
import { BuiltInEnchantmentsSection, type BuiltInEnchantment } from './BuiltInEnchantmentsSection';
import { DlcContentsSection } from './DlcContentsSection';
import { EffectsSection, type EffectValue } from './EffectsSection';
import { EnchantmentTiersTable, type EnchantmentLevel } from './EnchantmentTiersTable';
import { LinkedGridSection } from './LinkedGridSection';
import { MobAttacksSection } from './MobAttacksSection';
import { ObtainingSection } from './ObtainingSection';
import { PropertiesSection } from './PropertiesSection';
import { QuestRewardsSection, type QuestReward } from './QuestRewardsSection';
import { QuestStorySection } from './QuestStorySection';
import { StatsSection } from './StatsSection';
import { TalismanTiers, type TalismanTier } from './TalismanTiers';
import { VariantsSection } from './VariantsSection';
import { WhereToFindSection } from './WhereToFindSection';

/** Every field any category's sections read, all optional: which ones exist depends on the category. */
interface Fields {
  properties?: string[];
  effect?: string;
  effectNote?: string;
  effects?: unknown[];
  effectValues?: EffectValue[];
  builtInEnchantments?: BuiltInEnchantment[];
  locations?: string[];
  locationIds?: string[];
  areas?: string[];
  baseItemId?: string;
  variantIds?: string[];
  levels?: EnchantmentLevel[];
  pointCost?: number[];
  gildedDescription?: string;
  stackable?: boolean;
  mobObtainable?: boolean;
  builtInto?: string[];
  season?: string;
  howToObtain?: string;
  obtaining?: string[];
  attacks?: string[];
  drops?: string[];
  mobIds?: string[];
  itemIds?: string[];
  questIds?: string[];
  tiers?: TalismanTier[];
  rewards?: QuestReward[];
  armorSet?: string;
}

/** Title of the locations block depends on what the entity is. */
const LOCATIONS_TITLE: Record<string, string> = {
  mobs: 'Found in',
  dlcs: 'Missions added',
  quests: 'Locations',
};

/**
 * Renders one entry of a category's `detailSections` (`config/display/*`). Every section hides
 * itself when its data is missing, so a partial entity never shows an empty heading.
 */
export function DetailSection({ name, data }: { name: string; data: DetailData }): ReactNode {
  const e = data.entity as unknown as Fields;
  const { refs } = data;
  switch (name) {
    case 'stats':
      return <StatsSection stats={data.stats} />;
    case 'properties':
      return <PropertiesSection properties={e.properties} />;
    case 'effects':
      return (
        <EffectsSection
          effect={e.effect}
          effects={e.effects}
          note={e.effectNote}
          values={e.effectValues}
        />
      );
    case 'forge':
      return <ForgeSlot data={data} variant="forge" />;
    case 'enchantments':
      return <BuiltInEnchantmentsSection builtIn={e.builtInEnchantments} refs={refs} />;
    case 'locations':
      return (
        <WhereToFindSection
          values={[...(e.locations ?? []), ...(e.locationIds ?? []), ...(e.areas ?? [])]}
          refs={refs}
          title={LOCATIONS_TITLE[data.category] ?? 'Where to find'}
        />
      );
    case 'variants':
      return <VariantsSection baseItemId={e.baseItemId} variantIds={e.variantIds} refs={refs} />;
    case 'levels':
      return (
        <EnchantmentTiersTable
          levels={e.levels}
          pointCost={e.pointCost}
          gildedDescription={e.gildedDescription}
          stackable={e.stackable}
          mobObtainable={e.mobObtainable}
        />
      );
    case 'builtInto':
      return (
        <LinkedGridSection id="built-into" title="Built into" values={e.builtInto} refs={refs} />
      );
    case 'obtaining':
      return (
        <ObtainingSection
          obtainedFrom={formatField(data.source, 'obtainedFrom', 'label')}
          season={e.season}
          howToObtain={e.howToObtain}
          obtaining={e.obtaining}
          refs={refs}
        />
      );
    case 'contents':
      return <DlcContentsSection groups={data.dlcContents} />;
    case 'attacks':
      return <MobAttacksSection attacks={e.attacks} />;
    case 'drops':
      return <LinkedGridSection id="drops" title="Drops" values={e.drops} refs={refs} />;
    case 'mobs':
      return <LinkedGridSection id="mobs" title="Mobs" values={e.mobIds} refs={refs} />;
    case 'items':
      return (
        <LinkedGridSection id="items" title="Items found here" values={e.itemIds} refs={refs} />
      );
    case 'quests':
      return <LinkedGridSection id="quests" title="Quests" values={e.questIds} refs={refs} />;
    case 'tiers':
      // Enchantments get the interactive viewer; talismans also keep the static tier cards below
      // it (the viewer is client-rendered state, the cards are plain crawlable content).
      return (
        <>
          <ForgeSlot data={data} variant="tiers" />
          {data.category === 'talismans' && <TalismanTiers tiers={e.tiers} />}
        </>
      );
    case 'rewards':
      return <QuestRewardsSection rewards={e.rewards} refs={refs} />;
    case 'story':
      return <QuestStorySection order={data.questOrder} />;
    case 'set':
      return (
        <ArmorSetSection setName={e.armorSet} pieces={data.setPieces} currentId={data.entity.id} />
      );
    default:
      return null;
  }
}
