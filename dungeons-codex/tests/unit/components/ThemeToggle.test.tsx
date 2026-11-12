import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

function setup() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('starts on System and offers Light, Dark and System', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
  });

  it('sets data-theme and persists the choice', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('dc:theme')).toBe('light');

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('dc:theme')).toBe('dark');
  });

  it('restores the stored choice on a fresh mount', () => {
    window.localStorage.setItem('dc:theme', 'light');
    setup();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('never ends up with nothing selected when the active item is clicked again', async () => {
    window.localStorage.setItem('dc:theme', 'dark');
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('follows the OS when set to System', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList);
    setup();
    expect(document.documentElement.dataset.theme).toBe('light');
    vi.restoreAllMocks();
  });

  it('still switches for this page view when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    vi.restoreAllMocks();
  });
});
