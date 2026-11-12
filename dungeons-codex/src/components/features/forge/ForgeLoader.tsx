'use client';

import dynamic from 'next/dynamic';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ForgeProps } from '@/lib/forge/types';

/** Same footprint as the loaded Forge, so nothing jumps when it arrives. */
function ForgeSkeleton() {
  return (
    <SectionBlock id="forge" title="Power Forge">
      <div
        role="status"
        aria-label="Loading the Power Forge"
        className="rounded-panel border-[1.5px] border-line bg-surface-1 p-5 shadow-card sm:p-7"
      >
        <div className="grid gap-6 @2xl:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </div>
    </SectionBlock>
  );
}

// The Forge reads the address bar (`?forge=`), so it renders in the browser only. Its chunk
// (slider, picker, math) is fetched after hydration and never ships with the page itself.
const PowerForge = dynamic(() => import('./PowerForge'), {
  ssr: false,
  loading: () => <ForgeSkeleton />,
});

export function ForgeLoader({ props }: { props: ForgeProps }) {
  return <PowerForge props={props} />;
}
