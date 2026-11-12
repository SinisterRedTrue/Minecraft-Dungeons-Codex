import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Panel } from '@/components/ui/Panel';
import { GAMES, GAME_IDS } from '@/config/games';
import { getCounts, getSyncDate } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
import { DISCLAIMER, LICENSE_URL, WIKI_URL } from '@/lib/site';
import { formatNumber } from '@/lib/utils/format';

export const metadata: Metadata = pageMetadata({
  title: 'About, Credits & License',
  description:
    'About Dungeons Codex, how to use it, where its data comes from (Minecraft Wiki, CC BY-NC-SA 3.0), what we changed, and our privacy and trademark notes.',
  path: '/about',
});

const A = 'font-semibold text-accent-text underline underline-offset-4 hover:text-text';

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Panel
      padding="lg"
      role="region"
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24"
      id={id}
    >
      <h2
        id={`${id}-title`}
        className="mb-3 font-display text-h2 leading-tight font-black tracking-display text-text uppercase"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-muted [&_strong]:text-text">{children}</div>
    </Panel>
  );
}

/** `/about`: About, How to use, Credits, What we changed, License, Privacy, Disclaimer, data freshness. */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-[var(--gutter)] py-10 sm:py-14">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />
      <h1 className="mt-4 mb-8 font-display text-h1 leading-tight font-black tracking-display text-text uppercase">
        About Dungeons Codex
      </h1>

      <div className="flex flex-col gap-6">
        <Section id="about" title="About">
          <p>
            Dungeons Codex is a fan-made reference for <strong>Minecraft Dungeons</strong> (2020)
            and <strong>Minecraft Dungeons II</strong> (2026): every weapon, armor set, enchantment,
            artifact, mob and location, with filters, search and planning tools. It is free, has no
            ads and never will: it is a non-commercial project.
          </p>
        </Section>

        <Section id="how-to-use" title="How to use it">
          <p>
            Start on the{' '}
            <Link href="/" className={A}>
              Game Picker
            </Link>{' '}
            and choose a game. Each game has eight sections; pick a type first, then narrow the list
            with filters. Numbers that the wiki does not document, such as damage between two listed
            power levels, are computed and always marked <strong>Approximate</strong>.
          </p>
          <p>
            Press <kbd className="rounded-xs bg-surface-3 px-1.5 font-pixel text-micro">Ctrl</kbd>{' '}
            or <kbd className="rounded-xs bg-surface-3 px-1.5 font-pixel text-micro">⌘</kbd> +{' '}
            <kbd className="rounded-xs bg-surface-3 px-1.5 font-pixel text-micro">K</kbd> on any
            page to open search.
          </p>
        </Section>

        <Section id="credits" title="Credits">
          <p>
            All game data and images come from the{' '}
            <a href={WIKI_URL} className={A} rel="noreferrer">
              Minecraft Wiki
            </a>{' '}
            and its contributors, licensed under{' '}
            <a href={LICENSE_URL} className={A} rel="noreferrer">
              CC BY-NC-SA 3.0
            </a>
            . Every detail page links the exact wiki page and revision it was taken from.
          </p>
          <p>
            Item and mob artwork is © Mojang Studios / Microsoft and is shown for identification
            only. Dungeons Codex uses its own wordmark and none of the official logos.
          </p>
        </Section>

        <Section id="changes" title="What we changed">
          <p>
            Data has been reformatted, normalized and combined from the Minecraft Wiki. Some values
            are computed (marked Approximate).
          </p>
        </Section>

        <Section id="license" title="License">
          <p>
            The data and our text content are released under the same{' '}
            <a href={LICENSE_URL} className={A} rel="noreferrer">
              CC BY-NC-SA 3.0
            </a>{' '}
            license: share alike, non-commercially, with attribution. The site&apos;s source code is
            a separate work under the MIT license; see the README for the split.
          </p>
        </Section>

        <Section id="privacy" title="Privacy">
          <p>
            There are no analytics, cookies or trackers. Your browser&apos;s local storage holds
            only your theme, favorites, compare selection, recent searches and saved builds, and
            none of it leaves your device.
          </p>
        </Section>

        <Section id="disclaimer" title="Disclaimer">
          <p>{DISCLAIMER}</p>
        </Section>

        <Section id="freshness" title="Data freshness">
          <ul className="flex flex-col gap-2">
            {GAME_IDS.map((game) => {
              const total = Object.values(getCounts(game)).reduce((sum, n) => sum + n, 0);
              const synced = getSyncDate(game);
              return (
                <li key={game}>
                  <Link href={`/${game}`} className={A}>
                    {GAMES[game].name}
                  </Link>
                  : {formatNumber(total)} entries, last synced <strong>{synced ?? 'never'}</strong>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}
