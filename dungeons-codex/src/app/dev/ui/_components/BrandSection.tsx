import Image from 'next/image';
import { Wordmark } from '@/components/layout/Wordmark';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Block } from './Block';

// Literal class names so Tailwind can see them.
const SWATCHES = [
  ['bg', 'bg-bg'],
  ['bg-2', 'bg-bg-2'],
  ['surface-1', 'bg-surface-1'],
  ['surface-2', 'bg-surface-2'],
  ['surface-3', 'bg-surface-3'],
  ['accent', 'bg-accent'],
  ['accent-hi', 'bg-accent-hi'],
  ['accent-edge', 'bg-accent-edge'],
  ['gold', 'bg-gold'],
  ['redstone', 'bg-redstone'],
  ['soul', 'bg-soul'],
  ['common', 'bg-rarity-common'],
  ['rare', 'bg-rarity-rare'],
  ['special', 'bg-rarity-special'],
  ['unique', 'bg-rarity-unique'],
] as const;

export function BrandSection() {
  return (
    <>
      <Block title="Brand">
        <div className="flex flex-wrap items-center gap-8">
          <Image
            src="/brand/logo.svg"
            alt="Dungeons Codex logo: an emerald gem over an open book"
            width={96}
            height={96}
            unoptimized
          />
          <div className="flex flex-col gap-4">
            <Wordmark size="hero" />
            <Wordmark size="md" />
            <Wordmark size="sm" />
          </div>
        </div>
      </Block>
      <Block title="Typography" className="flex-col">
        <SectionHeading
          className="w-full"
          as="h2"
          eyebrow="Eyebrow"
          title="Section heading"
          subtitle="Centered, with a subtitle."
        />
        <SectionHeading as="h3" align="left" title="Left aligned heading" />
        <p className="font-pixel text-micro tracking-pixel uppercase">Pixel micro 0123456789</p>
        <p className="text-muted">Body text on the page background, muted.</p>
      </Block>
      <Block title="Tokens" className="gap-3">
        {SWATCHES.map(([name, cls]) => (
          <div key={name} className="flex w-24 flex-col gap-1">
            <div className={`${cls} h-12 rounded-sm border border-line-strong`} />
            <span className="text-xs text-muted">{name}</span>
          </div>
        ))}
      </Block>
    </>
  );
}
