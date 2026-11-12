import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges conflicting core utilities and drops falsy input', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('p-2', false && 'p-4', undefined, null)).toBe('p-2');
  });

  it('keeps our custom font-size and colour utilities side by side', () => {
    expect(cn('text-h1', 'text-muted')).toBe('text-h1 text-muted');
    expect(cn('text-micro', 'text-accent-text')).toBe('text-micro text-accent-text');
  });

  it('still resolves conflicts inside our custom groups', () => {
    expect(cn('text-h2', 'text-h1')).toBe('text-h1');
    expect(cn('rounded-card', 'rounded-btn')).toBe('rounded-btn');
    expect(cn('shadow-card', 'shadow-soft')).toBe('shadow-soft');
    expect(cn('tracking-btn', 'tracking-display')).toBe('tracking-display');
  });

  it('does not confuse font family with font weight', () => {
    expect(cn('font-display', 'font-black')).toBe('font-display font-black');
    expect(cn('font-display', 'font-pixel')).toBe('font-pixel');
  });
});
