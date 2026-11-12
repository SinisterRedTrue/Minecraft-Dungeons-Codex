export const THEME_KEY = 'dc:theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Dungeon Night is the default: only an explicit light choice or a light OS setting flips it. */
export function resolveTheme(pref: ThemePreference, systemPrefersLight: boolean): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemPrefersLight ? 'light' : 'dark';
}

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme. Must stay
 * dependency-free and wrapped in try/catch: storage or matchMedia can throw. Keep the logic in
 * sync with resolveTheme above (a unit test executes this exact string).
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;try{var s=localStorage.getItem('${THEME_KEY}');var l=window.matchMedia('(prefers-color-scheme: light)').matches;d.dataset.theme=s==='light'||s==='dark'?s:(l?'light':'dark')}catch(e){d.dataset.theme='dark'}})();`;
