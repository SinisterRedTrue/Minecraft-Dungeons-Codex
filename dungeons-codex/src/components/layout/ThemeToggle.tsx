'use client';

import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isThemePreference, type ThemePreference } from '@/lib/theme/theme';
import { useTheme } from './ThemeProvider';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup.Root
      type="single"
      value={theme}
      // Radix reports '' when the active item is clicked again; a theme must always stay selected.
      onValueChange={(v) => isThemePreference(v) && setTheme(v)}
      aria-label="Colour theme"
      className={cn(
        'inline-flex items-center gap-1 rounded-chip border border-line bg-surface-2 p-1',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroup.Item
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className={cn(
            'grid h-9 w-9 cursor-pointer place-items-center rounded-chip text-muted transition-colors duration-200',
            'hover:bg-accent/20 hover:text-text',
            'data-[state=on]:bg-accent data-[state=on]:text-accent-ink pointer-coarse:h-11 pointer-coarse:w-11',
          )}
        >
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
