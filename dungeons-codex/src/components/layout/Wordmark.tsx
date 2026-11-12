import { cn } from '@/lib/utils/cn';

const SIZE = {
  sm: 'text-lg [text-shadow:0_2px_0_var(--accent-edge)]',
  md: 'text-h2 [text-shadow:0_3px_0_var(--accent-edge)]',
  hero: 'text-hero [text-shadow:0_4px_0_var(--accent-edge),0_10px_30px_var(--accent-glow)]',
} as const;

export type WordmarkProps = {
  size?: keyof typeof SIZE;
  /** On the always-night hero: theme-independent ink instead of the page text colours. */
  onNight?: boolean;
  className?: string;
};

/** "DUNGEONS CODEX" as live text with the 3D shadow (Design System §4); no image asset needed. */
export function Wordmark({ size = 'md', onNight = false, className }: WordmarkProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-wrap gap-x-[0.35em] font-display leading-none font-black tracking-display uppercase',
        onNight ? 'text-hero-text' : 'text-text',
        SIZE[size],
        className,
      )}
    >
      <span>Dungeons</span>
      {/* A real space: the flex items drop it visually, but names and copy-paste keep it. */}{' '}
      <span className={onNight ? 'text-accent-hi' : 'text-accent-text'}>Codex</span>
    </span>
  );
}
