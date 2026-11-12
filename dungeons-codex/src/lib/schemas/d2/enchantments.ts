import type { z } from 'zod';
import { entitySchema } from '../base';
import { enchantmentShape } from '../d1/enchantments';

/** §4.3 `D2Enchantment`: same shape as D1 until Prompt 05 checks `Dungeons_II:Enchantment`. */
export const d2EnchantmentSchema = () => entitySchema(enchantmentShape('d2'));

export const D2EnchantmentSchema = d2EnchantmentSchema();
export type D2Enchantment = z.infer<typeof D2EnchantmentSchema>;
