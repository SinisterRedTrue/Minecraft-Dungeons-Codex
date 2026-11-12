import { isValidCategory, isValidGame, type GameId } from '@/config/games';

/** Per-game pages that exist in both games and are kept when switching games. */
const SHARED_PAGES = ['compare', 'planner'];

/**
 * Where the D1/D2 switcher goes (Prompt 06 task 3): the same section in the other game when it
 * has one, the same tool page (compare, planner), otherwise that game's hub. Detail pages and
 * query strings are dropped: slugs rarely exist in both games.
 */
export function gameSwitchHref(pathname: string, target: GameId): string {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (first && isValidGame(first) && second) {
    if (SHARED_PAGES.includes(second) || isValidCategory(target, second)) {
      return `/${target}/${second}`;
    }
  }
  return `/${target}`;
}

/** The game a pathname belongs to (`/d2/weapons` → `d2`), or undefined on neutral pages. */
export function gameFromPathname(pathname: string): GameId | undefined {
  const first = pathname.split('/').filter(Boolean)[0];
  return first && isValidGame(first) ? first : undefined;
}

/** True when `pathname` is `href` or below it (`/d1/weapons/claymore` is inside `/d1/weapons`). */
export function isWithin(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
