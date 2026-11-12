import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_INIT_SCRIPT, isThemePreference, resolveTheme } from '@/lib/theme/theme';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveTheme', () => {
  it('keeps an explicit choice regardless of the OS', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('follows the OS for system, defaulting to dark', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });
});

describe('isThemePreference', () => {
  it('accepts only the three known values', () => {
    expect(['light', 'dark', 'system'].every(isThemePreference)).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

// Runs the real inline <head> script string, so a typo in it fails here rather than in a browser.
function runInitScript(): string | undefined {
  new Function(THEME_INIT_SCRIPT)();
  return document.documentElement.dataset.theme;
}

describe('THEME_INIT_SCRIPT', () => {
  it('applies a stored explicit theme', () => {
    window.localStorage.setItem('dc:theme', 'light');
    expect(runInitScript()).toBe('light');
    window.localStorage.setItem('dc:theme', 'dark');
    expect(runInitScript()).toBe('dark');
  });

  it('falls back to the OS preference for system or a missing / unknown value', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(runInitScript()).toBe('light');
    window.localStorage.setItem('dc:theme', 'system');
    expect(runInitScript()).toBe('light');
    window.localStorage.setItem('dc:theme', 'garbage');
    expect(runInitScript()).toBe('light');
  });

  it('defaults to dark when the OS does not ask for light', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    expect(runInitScript()).toBe('dark');
  });

  it('falls back to dark when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(runInitScript()).toBe('dark');
  });
});
