import { cn } from '@/lib/utils/cn';

const FILL = {
  bg: 'fill-bg',
  'bg-2': 'fill-bg-2',
  'surface-1': 'fill-surface-1',
  'surface-2': 'fill-surface-2',
} as const;

export type WaveDividerProps = {
  /** Background token of the NEXT section: the wave is filled with it. */
  to: keyof typeof FILL;
  /** Flip vertically, for a wave that rises into the section above instead. */
  flip?: boolean;
  className?: string;
};

export function WaveDivider({ to, flip, className }: WaveDividerProps) {
  return (
    <svg
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cn('block h-10 w-full sm:h-16', FILL[to], flip && 'rotate-180', className)}
    >
      <path d="M0 40C120 8 240 8 360 28s240 36 360 20 240-44 360-36 240 32 360 24V64H0Z" />
    </svg>
  );
}
