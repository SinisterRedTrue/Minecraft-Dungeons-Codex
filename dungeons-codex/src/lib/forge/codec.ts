/**
 * `?forge=` share links: base64url( JSON `{ p?, e: [[slug, tier], …] }` ), checked by hand.
 * `p` is the power level (D1 only), `e` the picked enchantments in slot order. Anything that does
 * not parse is rejected as a whole, so a mangled link never half-applies. Plain checks, not Zod:
 * the detail pages carry this module and Zod would add about 30 kB gzip to them.
 */
import type { Pick, Tier } from './enchantments';

export const MAX_POWER = 263;
export const MAX_PICKS = 3;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ForgeState {
  power?: number | undefined;
  picks: Pick[];
}

function toBase64Url(json: string): string {
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

export function encodeForge(state: ForgeState): string {
  const payload = {
    ...(state.power === undefined ? {} : { p: state.power }),
    e: state.picks.map((pick) => [pick.slug, pick.tier]),
  };
  return toBase64Url(JSON.stringify(payload));
}

const isTier = (value: unknown): value is Tier => value === 1 || value === 2 || value === 3;

/** The state a decoded JSON value holds, or `undefined` when it is not exactly the link shape. */
function toState(value: unknown): ForgeState | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const { p, e, ...rest } = value as Record<string, unknown>;
  if (Object.keys(rest).length > 0) return undefined;
  if (
    p !== undefined &&
    !(Number.isInteger(p) && (p as number) >= 1 && (p as number) <= MAX_POWER)
  ) {
    return undefined;
  }
  if (!Array.isArray(e) || e.length > MAX_PICKS) return undefined;
  const picks: Pick[] = [];
  for (const entry of e) {
    if (!Array.isArray(entry) || entry.length !== 2) return undefined;
    const [slug, tier] = entry as unknown[];
    if (typeof slug !== 'string' || !SLUG.test(slug) || !isTier(tier)) return undefined;
    picks.push({ slug, tier });
  }
  return { power: p as number | undefined, picks };
}

/** The state a `?forge=` value holds, or `undefined` when it is not a valid link. */
export function decodeForge(value: string | null | undefined): ForgeState | undefined {
  if (!value) return undefined;
  try {
    return toState(JSON.parse(fromBase64Url(value)));
  } catch {
    return undefined;
  }
}
