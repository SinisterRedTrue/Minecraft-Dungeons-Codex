import type { ReactNode } from 'react';
import { SiteShell } from '@/components/layout/SiteShell';

/** `/`, `/about`, `/favorites`: neutral pages wear the D1 emerald accent (Plans §05 Layouts). */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div data-game="d1">
      <SiteShell>{children}</SiteShell>
    </div>
  );
}
