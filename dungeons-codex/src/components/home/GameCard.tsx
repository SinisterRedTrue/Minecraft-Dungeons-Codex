import Link from 'next/link';
import { Button3D } from '@/components/ui/Button3D';
import { Card } from '@/components/ui/Card';
import { RarityFrame, type Rarity, type RarityFrameSize } from '@/components/ui/RarityFrame';
import { GAMES, type CategorySlug, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import type { ShowcaseItem } from '@/lib/showcase';
import { formatNumber } from '@/lib/utils/format';
import { TiltCard } from './TiltCard';

/** The counts a card advertises, in order. */
const HIGHLIGHTS: Record<GameId, CategorySlug<GameId>[]> = {
  d1: ['weapons', 'armor', 'enchantments', 'artifacts', 'mobs', 'dlcs'],
  d2: ['weapons', 'armor', 'enchantments', 'talismans', 'quests', 'mobs'],
};

// Collage geometry: sizes and tilts for the five overlapping slots, centre slot biggest.
// Below `sm` the frames shrink (class override) so the card never outgrows a 360 px phone.
const COLLAGE: { size: RarityFrameSize; className: string }[] = [
  { size: 48, className: '-rotate-6 max-sm:w-10' },
  { size: 72, className: 'rotate-3 max-sm:w-14' },
  { size: 128, className: 'rotate-0 max-sm:w-24' },
  { size: 72, className: '-rotate-3 max-sm:w-14' },
  { size: 48, className: 'rotate-6 max-sm:w-10' },
];

function label(game: GameId, category: CategorySlug<GameId>): string {
  const text = getSection(game, category)?.label ?? category;
  return text === 'DLCs' ? text : text.toLowerCase();
}

export type GameCardProps = {
  game: GameId;
  counts: Record<string, number>;
  icons: readonly ShowcaseItem[];
};

/**
 * One game on the picker: an icon collage made from real items, title, year, live counts and an
 * "Enter" button in the game's own accent. The whole card is a single link.
 */
export function GameCard({ game, counts, icons }: GameCardProps) {
  const info = GAMES[game];
  return (
    // data-game on the wrapper gives this card its game's accent even on the neutral picker page.
    <TiltCard data-game={game}>
      <Link href={`/${game}`} className="block rounded-panel focus-visible:outline-offset-4">
        <Card
          radius="panel"
          padding="lg"
          className="group flex flex-col items-center gap-6 text-center"
        >
          <div className="flex items-end justify-center -space-x-4 pt-2" aria-hidden="true">
            {icons.map((item, index) => {
              const slot = COLLAGE[index];
              if (!slot) return null;
              return (
                <RarityFrame
                  key={item.id}
                  rarity={(item.rarity as Rarity | undefined) ?? 'common'}
                  size={slot.size}
                  src={item.image.src}
                  className={slot.className}
                />
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-1">
            <h3 className="font-display text-h2 leading-tight font-black tracking-display text-text uppercase">
              {info.name}
            </h3>
            <p className="font-pixel text-micro tracking-pixel text-accent-text uppercase">
              {info.year}
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
            {HIGHLIGHTS[game].map((category) => (
              <li key={category}>
                <span className="font-pixel text-accent-text">
                  {formatNumber(counts[category] ?? 0)}
                </span>{' '}
                {label(game, category)}
              </li>
            ))}
          </ul>

          <Button3D asChild size="lg">
            <span>Enter {info.short}</span>
          </Button3D>
        </Card>
      </Link>
    </TiltCard>
  );
}
