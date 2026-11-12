import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Original pixel-art empty chest, drawn from brand tokens so it follows both themes. */
function EmptyChest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 14" shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x="2" y="0" width="12" height="4" className="fill-gold-edge" />
      <rect x="3" y="1" width="10" height="2" className="fill-gold-deep" />
      <rect x="2" y="4" width="12" height="3" className="fill-gold-ink" />
      <rect x="1" y="7" width="14" height="7" className="fill-gold-deep" />
      <rect x="1" y="7" width="14" height="1" className="fill-gold-hi" />
      <rect x="1" y="13" width="14" height="1" className="fill-gold-edge" />
      <rect x="1" y="7" width="2" height="7" className="fill-gold-edge" />
      <rect x="13" y="7" width="2" height="7" className="fill-gold-edge" />
      <rect x="7" y="8" width="2" height="3" className="fill-rarity-common" />
      <rect x="7" y="9" width="2" height="1" className="fill-gold-ink" />
    </svg>
  );
}

export type EmptyStateProps = {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, text, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
      <EmptyChest className="h-20 w-[92px]" />
      <h3 className="font-display text-h3 font-extrabold text-text uppercase">{title}</h3>
      {text && <p className="max-w-md text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
