/**
 * Site-wide constants and URL helpers. `NEXT_PUBLIC_SITE_URL` is the production origin (set on
 * Vercel, Prompt 14 / Human step H2); without it the site falls back to localhost so builds and
 * tests never depend on it.
 */

export const SITE_NAME = 'Dungeons Codex';
export const SITE_TAGLINE = 'Every weapon, armor, enchantment and mob of Dungeons I & II.';
export const SITE_DESCRIPTION =
  'An unofficial fan wiki for Minecraft Dungeons and Minecraft Dungeons II: browse weapons, armor, enchantments, artifacts, mobs and locations with filters, search and tools.';

/** Exact disclaimer text from `[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`; do not reword. */
export const DISCLAIMER =
  'Dungeons Codex is an unofficial fan site. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Game data and images from the Minecraft Wiki (minecraft.wiki), licensed CC BY-NC-SA 3.0.';

export const WIKI_URL = 'https://minecraft.wiki';
export const LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/3.0/';

export const DEFAULT_SITE_URL = 'http://localhost:3000';

/** A valid http(s) origin without a trailing slash, or the localhost default. */
export function normalizeSiteUrl(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** `/d1/weapons` → `https://example.com/d1/weapons`. */
export function absoluteUrl(path: string, base: string = SITE_URL): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
