import type { Metadata } from 'next';
import { Rubik, Silkscreen } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { THEME_INIT_SCRIPT } from '@/lib/theme/theme';

const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-rubik',
  display: 'swap',
});

const silkscreen = Silkscreen({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-silkscreen',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}: Minecraft Dungeons & Dungeons II wiki`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
};

/**
 * Root layout: only <html>/<body>, fonts, the theme script and providers. The header and footer
 * live in `SiteShell`, rendered by the `(site)` and `[game]` layouts so each carries its own
 * `data-game` accent in the server HTML.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning className={`${rubik.variable} ${silkscreen.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
