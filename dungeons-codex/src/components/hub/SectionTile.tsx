import { Gem } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { RarityFrame } from '@/components/ui/RarityFrame';
import { formatNumber } from '@/lib/utils/format';

export type SectionTileProps = {
  href: string;
  label: string;
  count: number;
  description: string;
  image?: { src: string; alt: string };
};

/** One of the 8 hub tiles: a representative icon, the label, a live count and a one-line description. */
export function SectionTile({ href, label, count, description, image }: SectionTileProps) {
  return (
    <Card interactive asChild padding="none" className="h-full p-4 sm:p-6">
      <Link href={href}>
        <RarityFrame size={72} src={image?.src} alt="" />
        <h3 className="mt-4 font-display text-sm font-extrabold tracking-display text-text uppercase sm:text-h3">
          {label}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 font-pixel text-sm text-accent-text">
          <Gem size={14} aria-hidden="true" />
          <span>{formatNumber(count)}</span>
          <span className="sr-only">entries</span>
        </p>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </Link>
    </Card>
  );
}
