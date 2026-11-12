import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our theme-mapped utilities. Without this, `text-h1` and `text-muted`
// both look like colours to it and one silently cancels the other.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['hero', 'h1', 'h2', 'h3', 'micro'] }],
      'font-family': [{ font: ['display', 'body', 'pixel'] }],
      rounded: [{ rounded: ['xs', 'btn', 'chip', 'card', 'panel', 'nav'] }],
      shadow: [{ shadow: ['soft', 'card'] }],
      tracking: [{ tracking: ['display', 'btn', 'pixel'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
