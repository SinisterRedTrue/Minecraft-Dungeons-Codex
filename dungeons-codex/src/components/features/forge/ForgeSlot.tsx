import type { DetailData } from '@/lib/detail/context';
import { forgePropsFor, tierPropsFor } from '@/lib/forge/data';
import { ForgeLoader } from './ForgeLoader';
import { TierViewer } from './TierViewer';

/**
 * Where a detail page mounts the Power Forge (`forge`: weapons and armor) or the TierViewer
 * (`tiers`: enchantments and talismans), chosen by the category's `detailSections`. It renders
 * nothing for an entity the Forge does not cover.
 */
export function ForgeSlot({ data, variant }: { data: DetailData; variant: 'forge' | 'tiers' }) {
  if (variant === 'tiers') {
    const props = tierPropsFor(data);
    return props ? <TierViewer {...props} /> : null;
  }
  const props = forgePropsFor(data);
  return props ? <ForgeLoader props={props} /> : null;
}
