import { cn } from '@/lib/utils/cn';

const SIZE = {
  sm: 'text-lg [text-shadow:0_2px_0_var(--accent-edge)]',
  md: 'text-h2 [text-shadow:0_3px_0_var(--accent-edge)]',
  hero: 'text-hero [text-shadow:0_4px_0_var(--accent-edge),0_10px_30px_var(--accent-glow)]',
} as const;

export type WordmarkProps = {
  size?: keyof typeof SIZE;
  className?: string;
};

/** "DUNGEONS CODEX" as live text with the 3D shadow (Design System §4); no image asset needed. */
export function Wordmark({ size = 'md', className }: WordmarkProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap gap-x-[0.35em] font-display leading-none font-black tracking-display text-text uppercase',
        SIZE[size],
        className,
      )}
    >
      <span>Dungeons</span>
      <span className="text-accent-text">Codex</span>
    </span>
  );
}
