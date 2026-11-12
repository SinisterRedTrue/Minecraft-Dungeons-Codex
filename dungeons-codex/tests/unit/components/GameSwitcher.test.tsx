import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSwitcher } from '@/components/layout/GameSwitcher';

let pathname = '/d1/weapons';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('GameSwitcher', () => {
  beforeEach(() => {
    pathname = '/d1/weapons';
  });

  it('marks the active game and keeps the section for the other one', () => {
    render(<GameSwitcher active="d1" />);
    const d1 = screen.getByRole('link', { name: /^D1/ });
    const d2 = screen.getByRole('link', { name: /^D2/ });
    expect(d1).toHaveAttribute('aria-current', 'true');
    expect(d2).not.toHaveAttribute('aria-current');
    expect(d1).toHaveAttribute('href', '/d1/weapons');
    expect(d2).toHaveAttribute('href', '/d2/weapons');
  });

  it('goes to the hub when the other game lacks the section', () => {
    pathname = '/d1/dlcs';
    render(<GameSwitcher active="d1" />);
    expect(screen.getByRole('link', { name: /^D2/ })).toHaveAttribute('href', '/d2');
  });

  it('has no active side on neutral pages and links both hubs', () => {
    pathname = '/about';
    render(<GameSwitcher />);
    expect(screen.getByRole('link', { name: /^D1/ })).toHaveAttribute('href', '/d1');
    expect(screen.getByRole('link', { name: /^D2/ })).toHaveAttribute('href', '/d2');
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('gives each side its own game accent', () => {
    render(<GameSwitcher active="d1" />);
    expect(screen.getByRole('link', { name: /^D2/ })).toHaveAttribute('data-game', 'd2');
  });

  it('names each link with the visible label first (WCAG label-in-name)', () => {
    render(<GameSwitcher active="d2" />);
    expect(screen.getByRole('link', { name: 'D2: Minecraft Dungeons II' })).toBeInTheDocument();
  });
});
