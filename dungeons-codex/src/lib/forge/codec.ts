/**
 * `?forge=` share links: base64url( JSON `{ p?, e: [[slug, tier], …] }` ), validated with Zod.
 * `p` is the power level (D1 only), `e` the picked enchantments in slot order. Anything that does
 * not parse is rejected as a whole, so a mangled link never half-applies.
 */
import { z } from 'zod';
import { slugSchema } from '@/lib/schemas/base';
import type { Pick } from './enchantments';

export const MAX_POWER = 263;
export const MAX_PICKS = 3;

const stateSchema = z.strictObject({
  p: z.number().int().min(1).max(MAX_POWER).optional(),
  e: z
    .array(z.tuple([slugSchema, z.union([z.literal(1), z.literal(2), z.literal(3)])]))
    .max(MAX_PICKS),
});

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
  const payload: z.infer<typeof stateSchema> = {
    ...(state.power === undefined ? {} : { p: state.power }),
    e: state.picks.map((pick) => [pick.slug, pick.tier]),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** The state a `?forge=` value holds, or `undefined` when it is not a valid link. */
export function decodeForge(value: string | null | undefined): ForgeState | undefined {
  if (!value) return undefined;
  try {
    const parsed = stateSchema.safeParse(JSON.parse(fromBase64Url(value)));
    if (!parsed.success) return undefined;
    return {
      power: parsed.data.p,
      picks: parsed.data.e.map(([slug, tier]) => ({ slug, tier })),
    };
  } catch {
    return undefined;
  }
}
