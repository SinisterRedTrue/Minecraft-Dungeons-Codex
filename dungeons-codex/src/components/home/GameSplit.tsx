import Image from 'next/image';
import Link from 'next/link';
import { Button3D } from '@/components/ui/Button3D';
import { RarityFrame, type Rarity, type RarityFrameSize } from '@/components/ui/RarityFrame';
import { GAMES, type CategorySlug, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import type { ShowcaseItem } from '@/lib/showcase';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format';

/** The counts a half advertises, in order. */
const HIGHLIGHTS: Record<GameId, CategorySlug<GameId>[]> = {
  d1: ['weapons', 'armor', 'enchantments', 'artifacts', 'mobs', 'dlcs'],
  d2: ['weapons', 'armor', 'enchantments', 'talismans', 'quests', 'mobs'],
};

// Collage geometry: sizes and tilts for the five overlapping slots, centre slot biggest.
const COLLAGE: { size: RarityFrameSize; className: string }[] = [
  { size: 48, className: '-rotate-6 max-sm:w-10' },
  { size: 72, className: 'rotate-3 max-sm:w-14' },
  { size: 128, className: 'rotate-0 max-sm:w-24' },
  { size: 72, className: '-rotate-3 max-sm:w-14' },
  { size: 48, className: 'rotate-6 max-sm:w-10' },
];

// Big, faded icons behind each half: depth for the scene. Percent offsets inside the half.
const GHOSTS = [
  { index: 0, className: 'left-[4%] top-[8%] -rotate-12' },
  { index: 2, className: 'right-[6%] top-[34%] rotate-6' },
  { index: 4, className: 'left-[10%] bottom-[10%] rotate-12' },
] as const;

function label(game: GameId, category: CategorySlug<GameId>): string {
  const text = getSection(game, category)?.label ?? category;
  return text === 'DLCs' ? text : text.toLowerCase();
}

export type GameSplitEntry = {
  game: GameId;
  counts: Record<string, number>;
  icons: readonly ShowcaseItem[];
};

function Panel({ game, counts, icons }: GameSplitEntry) {
  const info = GAMES[game];
  return (
    // data-game gives each half its own accent even on the neutral picker page.
    <Link href={`/${game}`} data-game={game} className="split-panel">
      <div aria-hidden="true" className="split-scene" data-scene={game}>
        {GHOSTS.map(({ index, className }) => {
          const item = icons[index];
          if (!item) return null;
          return (
            <Image
              key={item.id}
              src={item.image.src}
              alt=""
              width={192}
              height={192}
              unoptimized
              className={cn(
                'absolute w-36 max-w-none opacity-[0.14] blur-[1px] [image-rendering:pixelated] xl:w-48',
                className,
              )}
            />
          );
        })}
      </div>

      <div className="split-content">
        <div
          className="flex items-end justify-center -space-x-4 pt-2 lg:origin-top lg:scale-75 xl:scale-100"
          aria-hidden="true"
        >
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

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.5rem)] leading-[1.05] font-black tracking-display text-hero-text uppercase [text-shadow:0_3px_0_var(--hero-from),0_6px_18px_var(--hero-from)]">
              {info.name}
            </h3>
            <p className="font-pixel text-micro tracking-pixel text-accent-hi uppercase">
              {info.year}
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-hero-muted">
            {HIGHLIGHTS[game].map((category) => (
              <li key={category}>
                <span className="font-pixel text-accent-hi">
                  {formatNumber(counts[category] ?? 0)}
                </span>{' '}
                {label(game, category)}
              </li>
            ))}
          </ul>

          <Button3D asChild size="md">
            <span>Enter {info.short}</span>
          </Button3D>
        </div>
      </div>
    </Link>
  );
}

/**
 * The Game Picker's selector: one panel, two joined halves, one diagonal divider. Hover or keyboard
 * focus on a half slides the divider toward the other side so the hovered game shows more of its
 * scene. Pure CSS (see `.split` in ui.css), so it stays a Server Component. Below `lg` the halves
 * stack with a slanted seam.
 */
export function GameSplit({ games }: { games: readonly [GameSplitEntry, GameSplitEntry] }) {
  return (
    <div className="split mt-12">
      {games.map((entry) => (
        <Panel key={entry.game} {...entry} />
      ))}
      <span aria-hidden="true" className="split-divider" />
    </div>
  );
}
