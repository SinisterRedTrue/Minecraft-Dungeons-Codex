import Link from 'next/link';
import { Marquee } from '@/components/hub/Marquee';
import { Card } from '@/components/ui/Card';
import { RarityFrame } from '@/components/ui/RarityFrame';

export interface DlcStripItem {
  slug: string;
  name: string;
  releaseDate?: string;
  image?: { src: string };
}

/** `2020-07-01` → "Jul 2020"; anything else is shown as-is. */
export function formatReleaseMonth(date: string | undefined): string | undefined {
  const match = date ? /^(\d{4})-(\d{2})/.exec(date) : null;
  if (!match) return date;
  const month = Number(match[2]);
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const name = names[month - 1];
  return name ? `${name} ${match[1]}` : date;
}

/** Minecraft Dungeons only: the DLC adventures in release order, drifting past and paused on hover. */
export function DlcStrip({ dlcs }: { dlcs: readonly DlcStripItem[] }) {
  return (
    <Marquee label="DLC adventures in release order" itemCount={dlcs.length}>
      {dlcs.map((dlc) => (
        <li key={dlc.slug} className="w-48 shrink-0 snap-start">
          <Card interactive asChild padding="sm" className="h-full">
            <Link href={`/d1/dlcs/${dlc.slug}`} className="flex items-center gap-3">
              <RarityFrame size={48} src={dlc.image?.src} alt="" />
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-bold text-text">{dlc.name}</span>
                {dlc.releaseDate && (
                  <span className="block font-pixel text-micro text-muted">
                    {formatReleaseMonth(dlc.releaseDate)}
                  </span>
                )}
              </span>
            </Link>
          </Card>
        </li>
      ))}
    </Marquee>
  );
}
