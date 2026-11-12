/**
 * `?b=` share links: one prefix character, then base64url.
 *
 *  - `r` + base64url( UTF-8 JSON ), or
 *  - `z` + base64url( deflate( UTF-8 JSON ) ) (fflate), whichever is shorter.
 *
 * Decoding validates the wire form with Zod (anything structurally wrong rejects the whole
 * link, so a mangled link never half-applies) and then drops what the game data does not know:
 * unknown slots, items and enchantments are removed and reported, never guessed.
 */
import { deflateSync, inflateSync } from 'fflate';
import type { GameId } from '@/config/games';
import type { EnchantmentTarget, Tier } from '@/lib/forge/enchantments';
import { getSlot, type SlotDef } from './slots';
import { fromWire, toWire, wireSchema, type Build, type SlotChoice } from './schema';

/** Longest link text accepted, and the largest JSON it may inflate to (a decompression guard). */
export const MAX_CODE_LENGTH = 4000;
const MAX_JSON_BYTES = 16 * 1024;
/** What a share URL must stay under (`/d2/planner?b=…`). */
export const MAX_URL_LENGTH = 2000;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** The text after `?b=`. */
export function encodeBuild(build: Build): string {
  const bytes = encoder.encode(JSON.stringify(toWire(build)));
  const raw = toBase64Url(bytes);
  const deflated = toBase64Url(deflateSync(bytes, { level: 9 }));
  return deflated.length < raw.length ? `z${deflated}` : `r${raw}`;
}

/** What the game data knows, for dropping unknown slugs while decoding. */
export interface Known {
  /** Whether `slug` is an item of the slot's category that may go into the slot. */
  hasItem(slot: SlotDef, slug: string): boolean;
  /** The targets an enchantment applies to; `undefined` for an unknown one. */
  enchantment(slug: string): readonly EnchantmentTarget[] | undefined;
}

export interface Dropped {
  what: 'slot' | 'item' | 'enchantment';
  slug: string;
  /** The slot it was in. */
  slot: string;
}

export interface Decoded {
  build: Build;
  dropped: Dropped[];
}

function parseWire(code: string, game: GameId) {
  if (code.length < 2 || code.length > MAX_CODE_LENGTH) return undefined;
  const mode = code[0];
  if (mode !== 'r' && mode !== 'z') return undefined;
  const packed = fromBase64Url(code.slice(1));
  const bytes = mode === 'z' ? inflateSync(packed) : packed;
  if (bytes.length > MAX_JSON_BYTES) return undefined;
  const parsed = wireSchema.safeParse(JSON.parse(decoder.decode(bytes)));
  return parsed.success && parsed.data.g === game ? parsed.data : undefined;
}

/**
 * The build a link holds, with what the game data does not know taken out, or `undefined` when
 * the link is not a valid build of `game`. Without `known`, only the structure is checked.
 */
export function decodeBuild(
  code: string | null | undefined,
  game: GameId,
  known?: Known,
): Decoded | undefined {
  if (!code) return undefined;
  let wire: ReturnType<typeof parseWire>;
  try {
    wire = parseWire(code, game);
  } catch {
    return undefined;
  }
  if (!wire) return undefined;

  const structural = fromWire(wire);
  const dropped: Dropped[] = [];
  const slots: Record<string, SlotChoice> = {};
  for (const [key, choice] of Object.entries(structural.slots)) {
    const slot = getSlot(game, key);
    if (!slot) {
      dropped.push({ what: 'slot', slug: key, slot: key });
      continue;
    }
    if (known && !known.hasItem(slot, choice.slug)) {
      dropped.push({ what: 'item', slug: choice.slug, slot: slot.label });
      continue;
    }
    const picks: SlotChoice['picks'] = [];
    for (const pick of choice.picks) {
      if (picks.length >= slot.enchantSlots || picks.some((p) => p.slug === pick.slug)) continue;
      const targets = known?.enchantment(pick.slug);
      // A slot that holds enchantments always has a target (see `slots.ts`).
      if (known && !targets?.includes(slot.target as EnchantmentTarget)) {
        dropped.push({ what: 'enchantment', slug: pick.slug, slot: slot.label });
        continue;
      }
      picks.push(pick);
    }
    const tier: Tier | undefined = slot.tiered ? (choice.tier ?? 1) : undefined;
    slots[key] = { slug: choice.slug, picks, ...(tier === undefined ? {} : { tier }) };
  }

  const build: Build = {
    game,
    ...(structural.name ? { name: structural.name } : {}),
    ...(game === 'd1' && structural.power !== undefined ? { power: structural.power } : {}),
    ...(structural.notes ? { notes: structural.notes } : {}),
    slots,
  };
  return { build, dropped };
}

/** A sentence for the toast that reports what was dropped. */
export function describeDropped(dropped: readonly Dropped[]): string {
  const names = dropped.map((d) => (d.what === 'slot' ? `slot “${d.slug}”` : `“${d.slug}”`));
  const shown = names.slice(0, 3).join(', ');
  const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
  return dropped.length === 1
    ? `One entry in this link no longer exists and was left out: ${shown}.`
    : `${dropped.length} entries in this link no longer exist and were left out: ${shown}${more}.`;
}
