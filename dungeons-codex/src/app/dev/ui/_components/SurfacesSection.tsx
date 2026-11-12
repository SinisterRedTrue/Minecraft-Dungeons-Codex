'use client';

import { Sword } from 'lucide-react';
import { useState } from 'react';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Panel } from '@/components/ui/Panel';
import { RarityFrame } from '@/components/ui/RarityFrame';
import { Block } from './Block';

const BADGES: BadgeVariant[] = [
  'common',
  'rare',
  'special',
  'unique',
  'dlc',
  'seasonal',
  'soul',
  'approximate',
  'partial',
  'unobtainable',
];

export function SurfacesSection() {
  const [picked, setPicked] = useState<string[]>(['Melee']);
  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  return (
    <>
      <Block title="Card · Panel">
        <Card className="w-64">
          <h3 className="text-h3 font-bold">Card</h3>
          <p className="text-sm text-muted">surface-1, 6 px edge, soft drop.</p>
        </Card>
        <Card interactive asChild className="w-64">
          <a href="#card-link" className="flex flex-col items-center gap-3 text-center">
            <RarityFrame rarity="rare">
              <Sword aria-hidden="true" />
            </RarityFrame>
            <span className="text-h3 font-bold">Interactive card</span>
            <span className="text-sm text-muted">Lifts 4 px; the frame glows.</span>
          </a>
        </Card>
        <Panel className="w-72">
          <h3 className="text-h3 font-bold">Panel</h3>
          <p className="text-sm text-muted">24 px radius for Infobox, Forge, Compare.</p>
        </Panel>
      </Block>
      <Block title="Chip">
        {['Melee', 'Ranged', 'Armor'].map((name, i) => (
          <Chip
            key={name}
            selected={picked.includes(name)}
            count={(i + 1) * 12}
            onClick={() => toggle(name)}
          >
            {name}
          </Chip>
        ))}
        <Chip>No count</Chip>
        <Chip selected>Selected</Chip>
        <Chip disabled>Disabled</Chip>
      </Block>
      <Block title="Badge">
        {BADGES.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </Block>
    </>
  );
}
