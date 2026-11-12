/**
 * Display config for the 16 sections: label, one-line description and the entity whose image
 * represents the section on hub tiles (Design System §10: no extra art, our own data's icons).
 * Prompt 07 extends `categories.ts` with filters and columns; this file stays about navigation.
 */
import type { CategorySlug, GameId } from './games';

export interface SectionConfig {
  label: string;
  /** One line for hub tiles, category intros and meta descriptions. */
  description: string;
  /** Entity id (`game:category:slug`) whose image is the tile icon; a test checks it exists. */
  tileEntityId: string;
}

type Sections = { [G in GameId]: { [C in CategorySlug<G>]: SectionConfig } };

export const SECTIONS: Sections = {
  d1: {
    weapons: {
      label: 'Weapons',
      description: 'Melee and ranged weapons with stats, uniques and built-in enchantments.',
      tileEntityId: 'd1:weapons:sword',
    },
    armor: {
      label: 'Armor',
      description: 'Armor sets, their effects and whether they take soul enchantments.',
      tileEntityId: 'd1:armor:heros-armor',
    },
    enchantments: {
      label: 'Enchantments',
      description: 'Every enchantment, its tier and what it can be applied to.',
      tileEntityId: 'd1:enchantments:sharpness',
    },
    artifacts: {
      label: 'Artifacts',
      description: 'Active gear with cooldowns, effects and soul requirements.',
      tileEntityId: 'd1:artifacts:lightning-rod',
    },
    dlcs: {
      label: 'DLCs',
      description: 'Every DLC adventure and the content it adds, in release order.',
      tileEntityId: 'd1:dlcs:jungle-awakens',
    },
    cosmetics: {
      label: 'Cosmetics',
      description: 'Skins, capes, pets, emotes and flairs, and how to get them.',
      tileEntityId: 'd1:cosmetics:amethyst-cape',
    },
    mobs: {
      label: 'Mobs',
      description: 'Enemies, bosses and friendly mobs you meet on your way.',
      tileEntityId: 'd1:mobs:creeper',
    },
    locations: {
      label: 'Locations',
      description: 'Missions and regions, with the gear and mobs found there.',
      tileEntityId: 'd1:locations:creeper-woods',
    },
  },
  d2: {
    weapons: {
      label: 'Weapons',
      description: 'Melee weapons, bows and crossbows, base and unique versions.',
      tileEntityId: 'd2:weapons:sword',
    },
    armor: {
      label: 'Armor',
      description: 'Armor sets of four pieces each, base and unique versions.',
      tileEntityId: 'd2:armor:monarch-mantle',
    },
    enchantments: {
      label: 'Enchantments',
      description: 'Weapon and armor enchantments and their tiers.',
      tileEntityId: 'd2:enchantments:ancient-alchemy',
    },
    artifacts: {
      label: 'Artifacts',
      description: 'Active gear with cooldowns, effects and soul costs.',
      tileEntityId: 'd2:artifacts:battle-banner',
    },
    talismans: {
      label: 'Talismans',
      description: 'Passive boosts, their tiers and how to earn them.',
      tileEntityId: 'd2:talismans:amethyst-lens',
    },
    quests: {
      label: 'Quests',
      description: 'Core and side quests with their rewards.',
      // Quests have no icon of their own (D-061), so the tile shows a village sprite.
      tileEntityId: 'd2:locations:brave-haven',
    },
    mobs: {
      label: 'Mobs',
      description: 'Enemies, bosses and friendly mobs you meet on your way.',
      tileEntityId: 'd2:mobs:creeper',
    },
    locations: {
      label: 'Locations',
      description: 'The main areas and the Rift, with their quests and mobs.',
      tileEntityId: 'd2:locations:ancient-city',
    },
  },
};

/** Section config for any category string; undefined when the game has no such section. */
export function getSection(game: GameId, category: string): SectionConfig | undefined {
  return (SECTIONS[game] as Record<string, SectionConfig>)[category];
}

/** Hub copy per game. */
export const GAME_BLURB: Record<GameId, string> = {
  d1: 'The 2020 dungeon crawler: all of its gear, mobs and DLC adventures.',
  d2: 'The 2026 sequel: new gear sets, talismans, quests and the Rift.',
};
