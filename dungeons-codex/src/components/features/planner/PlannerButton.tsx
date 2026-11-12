'use client';

import { Hammer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button3D } from '@/components/ui/Button3D';
import type { GameId } from '@/config/games';
import { isPlannable } from '@/lib/planner/slots';

/**
 * "Open in Planner" on a detail page (Plans §07 §5): puts the item into its slot of this game's
 * draft build (`dc:planner-draft:{game}`) and goes to the planner. Renders nothing for a
 * category the planner has no slot for.
 */
export function PlannerButton({
  game,
  category,
  slug,
  name,
  fields,
}: {
  game: GameId;
  category: string;
  slug: string;
  name: string;
  /** What decides the slot: `kind` of a weapon, `slot` of a D2 armor piece. */
  fields: { kind?: unknown; slot?: unknown };
}) {
  const router = useRouter();
  if (!isPlannable(game, category)) return null;
  const open = async () => {
    // Loaded on click: the planner store pulls in Zod, which no detail page needs to download.
    const { addToDraft, draftStore } = await import('@/lib/planner/store');
    addToDraft(draftStore(game), game, category, slug, fields);
    router.push(`/${game}/planner`);
  };
  return (
    <Button3D variant="stone" onClick={open} icon={<Hammer size={18} aria-hidden="true" />}>
      Open in Planner <span className="sr-only">{name}</span>
    </Button3D>
  );
}
