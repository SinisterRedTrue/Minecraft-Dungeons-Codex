import { Command } from 'cmdk';
import { CornerDownLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { GAME_IDS, GAMES, type GameId } from '@/config/games';
import { getSection, SECTIONS } from '@/config/sections';
import type { RecentEntry } from '@/lib/search/recent';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];
export const LIST_CLASS =
  'min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-pixel [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:tracking-pixel [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase';

export const GAME_TAG: Record<GameId, string> = { d1: 'D1', d2: 'D2' };

export function ResultRow({
  entry,
  value,
  onSelect,
}: {
  entry: RecentEntry;
  value: string;
  onSelect: () => void;
}) {
  const rarity = RARITIES.find((r) => r === entry.r);
  const section = getSection(entry.g, entry.c);
  return (
    <Row
      value={value}
      icon={<RarityFrame size={48} rarity={rarity} src={entry.i} alt="" />}
      title={entry.n}
      subtitle={section?.label ?? entry.c}
      game={entry.g}
      onSelect={onSelect}
    />
  );
}

export function Row({
  value,
  icon,
  title,
  subtitle,
  game,
  onSelect,
}: {
  value: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  game?: GameId;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-btn border-l-4 border-transparent px-2 py-1.5 text-text outline-none aria-selected:border-accent aria-selected:bg-surface-2"
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{title}</span>
        <span className="block truncate text-sm text-muted">{subtitle}</span>
      </span>
      {game && (
        <Badge data-game={game} variant="dlc" aria-label={GAMES[game].name}>
          {GAME_TAG[game]}
        </Badge>
      )}
      <CornerDownLeft
        size={16}
        aria-hidden="true"
        className="shrink-0 text-muted opacity-0 group-aria-selected:opacity-100 pointer-coarse:hidden"
      />
    </Command.Item>
  );
}

export type JumpTarget = {
  href: string;
  label: string;
  subtitle: string;
  game?: GameId;
  icon: ReactNode;
};

const iconOf = (entityId: string) => {
  const [game, category, slug] = entityId.split(':');
  return <RarityFrame size={48} src={`/images/${game}/${category}/${slug}.webp`} alt="" />;
};

/** The eight sections of the current game; on neutral pages the two game hubs. */
export function jumpTargets(game?: GameId): JumpTarget[] {
  if (game) {
    return GAMES[game].categories.map((category) => {
      const section = getSection(game, category);
      return {
        href: `/${game}/${category}`,
        label: section?.label ?? category,
        subtitle: section?.description ?? '',
        game,
        icon: section ? iconOf(section.tileEntityId) : null,
      };
    });
  }
  return GAME_IDS.map((id) => ({
    href: `/${id}`,
    label: GAMES[id].name,
    subtitle: `${Object.keys(SECTIONS[id]).length} sections`,
    game: id,
    icon: iconOf(SECTIONS[id].weapons.tileEntityId),
  }));
}
