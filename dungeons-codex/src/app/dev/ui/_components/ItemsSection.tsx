import { Gem, Shield, Sword } from 'lucide-react';
import { Button3D } from '@/components/ui/Button3D';
import { EmptyState } from '@/components/ui/EmptyState';
import { RarityFrame, type Rarity, type RarityFrameSize } from '@/components/ui/RarityFrame';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatBar } from '@/components/ui/StatBar';
import { Block } from './Block';

const RARITIES: Rarity[] = ['common', 'rare', 'special', 'unique'];
const SIZES: RarityFrameSize[] = [48, 72, 128, 192];
const ICONS = [Sword, Shield, Gem, Sword];

export function ItemsSection() {
  return (
    <>
      {SIZES.map((size) => (
        <Block key={size} title={`RarityFrame · ${size}`}>
          {RARITIES.map((rarity, i) => {
            const Icon = ICONS[i] ?? Sword;
            return (
              <RarityFrame key={rarity} rarity={rarity} size={size}>
                <Icon aria-hidden="true" />
              </RarityFrame>
            );
          })}
        </Block>
      ))}
      <Block title="RarityFrame · placeholder (no image)">
        <RarityFrame />
      </Block>
      <Block title="StatBar" className="w-full max-w-md flex-col">
        <StatBar label="Damage" value={38} max={60} />
        <StatBar label="Speed" value={1.4} max={2} unit="s" />
        <StatBar label="Damage at power 263" value={412} max={500} approximate />
        <StatBar label="Empty" value={0} max={10} />
      </Block>
      <Block title="Skeleton" className="w-full max-w-md flex-col">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </Block>
      <Block title="EmptyState" className="w-full">
        <EmptyState
          title="No results"
          text="Nothing matches those filters. Try removing one."
          action={<Button3D variant="stone">Clear filters</Button3D>}
        />
      </Block>
    </>
  );
}
