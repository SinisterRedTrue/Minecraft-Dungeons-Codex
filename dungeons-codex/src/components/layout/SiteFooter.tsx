import Image from 'next/image';
import Link from 'next/link';
import { GAMES, GAME_IDS } from '@/config/games';
import { DISCLAIMER, LICENSE_URL, WIKI_URL } from '@/lib/site';
import { Wordmark } from './Wordmark';

const LINK =
  'inline-flex min-h-8 items-center text-muted underline-offset-4 hover:text-text hover:underline pointer-coarse:min-h-11';

/**
 * Footer per `[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`: the license line (with the last data sync),
 * the exact disclaimer, and links. A server component: the date is read at build time.
 */
export function SiteFooter({ syncDate }: { syncDate?: string }) {
  return (
    <footer className="border-t border-line bg-surface-1 py-10">
      <div className="mx-auto grid max-w-site gap-8 px-[var(--gutter)] lg:grid-cols-[auto_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-3">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2"
            aria-label="Dungeons Codex, home"
          >
            <Image src="/brand/logo.svg" alt="" width={34} height={34} unoptimized />
            <Wordmark size="sm" />
          </Link>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              {GAME_IDS.map((game) => (
                <li key={game}>
                  <Link href={`/${game}`} className={LINK}>
                    {GAMES[game].name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/favorites" className={LINK}>
                  Favorites
                </Link>
              </li>
              <li>
                <Link href="/about" className={LINK}>
                  About &amp; Credits
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 text-sm text-muted">
          <p>
            <a
              href={WIKI_URL}
              className="underline underline-offset-4 hover:text-text"
              rel="noreferrer"
            >
              Data © Minecraft Wiki contributors
            </a>
            {' · '}
            <a
              href={LICENSE_URL}
              className="underline underline-offset-4 hover:text-text"
              rel="noreferrer"
            >
              CC BY-NC-SA 3.0
            </a>
            {syncDate ? ` · Last synced ${syncDate}` : ''}
          </p>
          <p>{DISCLAIMER}</p>
        </div>
      </div>
    </footer>
  );
}
