/** Which parser handles which game/category. Prompt 05 adds the D2 parsers. */
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

export const PARSERS: Record<GameId, Partial<Record<string, Parser>>> = {
  d1: { weapons, armor, enchantments, artifacts, dlcs, cosmetics, mobs, locations },
  d2: {},
};
