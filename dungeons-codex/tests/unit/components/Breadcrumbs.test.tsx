import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatReleaseMonth } from '@/components/hub/DlcStrip';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

describe('Breadcrumbs', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Minecraft Dungeons', href: '/d1' },
    { label: 'Weapons' },
  ];

  it('renders links for ancestors and marks the current page', () => {
    render(<Breadcrumbs items={items} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Minecraft Dungeons' })).toHaveAttribute('href', '/d1');
    expect(screen.queryByRole('link', { name: 'Weapons' })).toBeNull();
    expect(screen.getByText('Weapons')).toHaveAttribute('aria-current', 'page');
  });

  it('emits a matching BreadcrumbList JSON-LD script', () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? '{}');
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].item).toMatch(/\/$/);
    expect(data.itemListElement[2].name).toBe('Weapons');
  });
});

describe('formatReleaseMonth', () => {
  it('formats ISO dates as "Mon YYYY" and passes anything else through', () => {
    expect(formatReleaseMonth('2020-07-01')).toBe('Jul 2020');
    expect(formatReleaseMonth('2022-10-19')).toBe('Oct 2022');
    expect(formatReleaseMonth('2022-13-01')).toBe('2022-13-01');
    expect(formatReleaseMonth('soon')).toBe('soon');
    expect(formatReleaseMonth(undefined)).toBeUndefined();
  });
});
