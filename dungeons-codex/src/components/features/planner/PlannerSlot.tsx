'use client';

import { ExternalLink, Plus, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import type { Pick, Tier } from '@/lib/forge/enchantments';
import type { SlotChoice } from '@/lib/planner/schema';
import type { SlotDef } from '@/lib/planner/slots';
import type { EntityListItem } from '@/lib/schemas';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];
const ROMAN = ['', 'I', 'II', 'III'] as const;
const TIERS = [
  { value: '1', label: 'I', ariaLabel: 'Tier I' },
  { value: '2', label: 'II', ariaLabel: 'Tier II' },
  { value: '3', label: 'III', ariaLabel: 'Tier III' },
] as const;

const ICON_BUTTON =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-sm text-muted hover:bg-surface-2 hover:text-text';

/**
 * One gear slot of the planner (Wireframes §6): empty it is a "+ Choose" button; filled it shows
 * the framed item, its enchantments with their tiers, and buttons to change, enchant or remove it.
 */
export function PlannerSlot({
  game,
  slot,
  choice,
  item,
  enchantName,
  onChoose,
  onEnchant,
  onRemove,
  onTier,
}: {
  game: string;
  slot: SlotDef;
  choice: SlotChoice | undefined;
  item: EntityListItem | undefined;
  /** Slug → display name of an enchantment. */
  enchantName: (slug: string) => string;
  onChoose: () => void;
  onEnchant: () => void;
  onRemove: () => void;
  onTier: (tier: Tier) => void;
}) {
  const rarity = RARITIES.find((r) => r === item?.rarity);
  return (
    <Card padding="sm" className="flex min-w-0 flex-col gap-3" data-testid={`slot-${slot.key}`}>
      <h4 className="m-0 font-pixel text-micro tracking-pixel text-muted uppercase">
        {slot.label}
      </h4>
      {!choice || !item ? (
        <button
          type="button"
          onClick={onChoose}
          aria-label={`Choose ${slot.label}`}
          className="flex min-h-24 w-full cursor-pointer items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-control text-base font-bold text-muted hover:border-accent hover:text-accent-text"
        >
          <Plus size={20} aria-hidden="true" />
          Choose
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <RarityFrame
              size={72}
              rarity={rarity}
              src={item.image?.src}
              alt=""
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="m-0 line-clamp-2 text-base leading-snug font-bold text-text">
                {item.name}
              </p>
              {slot.tiered && (
                <ToggleGroup
                  aria-label={`${slot.label} tier`}
                  value={String(choice.tier ?? 1)}
                  onValueChange={(value) => onTier(Number(value) as Tier)}
                  options={TIERS}
                  className="mt-1"
                />
              )}
            </div>
          </div>
          {slot.enchantSlots > 0 && <EnchantChips picks={choice.picks} enchantName={enchantName} />}
          <div className="mt-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={onChoose}
              aria-label={`Change ${slot.label}: ${item.name}`}
              className="min-h-11 cursor-pointer rounded-sm px-3 text-sm font-semibold text-accent-text hover:bg-surface-2"
            >
              Change
            </button>
            {slot.enchantSlots > 0 && (
              <button
                type="button"
                onClick={onEnchant}
                aria-label={`Enchant ${slot.label}: ${item.name}`}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-accent-text hover:bg-surface-2"
              >
                <Sparkles size={16} aria-hidden="true" />
                Enchant
              </button>
            )}
            <span className="ml-auto flex">
              <a
                href={`/${game}/${item.category}/${item.slug}`}
                target="_blank"
                rel="noopener"
                aria-label={`Open ${item.name} in a new tab`}
                className={ICON_BUTTON}
              >
                <ExternalLink size={18} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${slot.label}: ${item.name}`}
                className={ICON_BUTTON}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function EnchantChips({
  picks,
  enchantName,
}: {
  picks: readonly Pick[];
  enchantName: (slug: string) => string;
}) {
  if (picks.length === 0) return <p className="m-0 text-sm text-muted">No enchantments</p>;
  return (
    <ul aria-label="Enchantments" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {picks.map((pick) => (
        <li key={pick.slug}>
          <Badge variant="partial">
            {enchantName(pick.slug)} {ROMAN[pick.tier]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
