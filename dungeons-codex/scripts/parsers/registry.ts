/** Which parser handles which game/category. */
import type { GameId } from '@/config/games';
import type { Parser } from './types';
import { parse as armor } from './d1/armor';
import { parse as artifacts } from './d1/artifacts';
import { parse as cosmetics } from './d1/cosmetics';
import { parse as dlcs } from './d1/dlcs';
import { parse as enchantments } from './d1/enchantments';
import { parse as locations } from './d1/locations';
import { parse as mobs } from './d1/mobs';
import { parse as weapons } from './d1/weapons';
import { parse as d2Armor } from './d2/armor';
import { parse as d2Artifacts } from './d2/artifacts';
import { parse as d2Enchantments } from './d2/enchantments';
import { parse as d2Locations } from './d2/locations';
import { parse as d2Mobs } from './d2/mobs';
import { parse as d2Quests } from './d2/quests';
import { parse as d2Talismans } from './d2/talismans';
import { parse as d2Weapons } from './d2/weapons';

export const PARSERS: Record<GameId, Partial<Record<string, Parser>>> = {
  d1: { weapons, armor, enchantments, artifacts, dlcs, cosmetics, mobs, locations },
  d2: {
    weapons: d2Weapons,
    armor: d2Armor,
    enchantments: d2Enchantments,
    artifacts: d2Artifacts,
    talismans: d2Talismans,
    quests: d2Quests,
    mobs: d2Mobs,
    locations: d2Locations,
  },
};
