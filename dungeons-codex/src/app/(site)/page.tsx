import { ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import { SearchPill } from '@/components/features/search/SearchButton';
import { FeatureCards } from '@/components/home/FeatureCards';
import { GameCard } from '@/components/home/GameCard';
import { HeroIcons } from '@/components/home/HeroIcons';
import { WaveDivider } from '@/components/layout/WaveDivider';
import { Wordmark } from '@/components/layout/Wordmark';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { GAME_IDS } from '@/config/games';
import { getCounts } from '@/lib/data';
import { getCollageIcons, getHeroIcons } from '@/lib/data/showcase';
import { pageMetadata } from '@/lib/seo';
import { SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Minecraft Dungeons & Dungeons II wiki',
    description: SITE_DESCRIPTION,
    path: '/',
  }),
  // The root template would append the site name to a title that already ends with it.
  title: { absolute: 'Dungeons Codex: Minecraft Dungeons & Dungeons II wiki' },
};

/** `/`: the Game Picker (Wireframes §1). */
export default function GamePickerPage() {
  const heroIcons = getHeroIcons(12);

  return (
    <>
      <section
        aria-label="Welcome"
        className="relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--hero-from),var(--hero-to))] text-hero-text"
      >
        {/* Torchlight: warm radial glows from the top corners. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_12%_0%,var(--torch),transparent),radial-gradient(ellipse_50%_60%_at_92%_8%,var(--torch),transparent)]"
        />
        <HeroIcons items={heroIcons} />

        <div className="relative mx-auto flex max-w-site flex-col items-center gap-6 px-[var(--gutter)] pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
          <h1>
            <Wordmark size="hero" onNight className="justify-center" />
          </h1>
          <p className="max-w-xl text-lg font-medium text-hero-muted">{SITE_TAGLINE}</p>
          <SearchPill />
          <a
            href="#choose"
            aria-label="Scroll to the games"
            className="mt-2 grid size-11 place-items-center rounded-chip text-hero-muted transition-colors hover:text-hero-text"
          >
            <ChevronDown size={30} aria-hidden="true" />
          </a>
        </div>
        <WaveDivider to="bg" className="absolute bottom-0 left-0" />
      </section>

      <section
        id="choose"
        aria-labelledby="choose-heading"
        className="scroll-mt-20 bg-bg pt-[var(--section-y-tight)] pb-[var(--section-y)]"
      >
        <div className="mx-auto max-w-site px-[var(--gutter)]">
          <SectionHeading
            eyebrow="Two games, one codex"
            title={<span id="choose-heading">Choose your adventure</span>}
          />
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {GAME_IDS.map((game) => (
              <GameCard
                key={game}
                game={game}
                counts={getCounts(game)}
                icons={getCollageIcons(game)}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="inside-heading"
        className="bg-bg-2 pt-[var(--section-y-tight)] sm:pt-[var(--section-y)]"
      >
        <div className="mx-auto max-w-site px-[var(--gutter)] pb-[var(--section-y-tight)]">
          <SectionHeading
            eyebrow="What's inside"
            title={<span id="inside-heading">Tools for every dungeon delver</span>}
          />
          <div className="mt-12">
            <FeatureCards />
          </div>
        </div>
        <WaveDivider to="surface-1" />
      </section>
    </>
  );
}
