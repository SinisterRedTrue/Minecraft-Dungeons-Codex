import type { Metadata } from 'next';
import { Rubik, Silkscreen } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';
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
  title: 'Dungeons Codex',
  description: 'An unofficial fan wiki for Minecraft Dungeons and Minecraft Dungeons II.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script sets data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning className={`${rubik.variable} ${silkscreen.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
