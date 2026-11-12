import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent, formatSeconds } from '@/lib/utils/format';

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(-4200)).toBe('-4,200');
  });

  it('keeps up to two decimals by default and honours the argument', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5');
    expect(formatNumber(0.333333)).toBe('0.33');
    expect(formatNumber(0.333333, 3)).toBe('0.333');
  });

  it('renders non-finite values as an en dash', () => {
    expect(formatNumber(NaN)).toBe('–');
    expect(formatNumber(Infinity)).toBe('–');
  });
});

describe('formatPercent', () => {
  it('formats fractions by default', () => {
    expect(formatPercent(0.25)).toBe('25%');
    expect(formatPercent(0.255, { digits: 1 })).toBe('25.5%');
    expect(formatPercent(1.5)).toBe('150%');
  });

  it('formats already-scaled values with fraction: false', () => {
    expect(formatPercent(25, { fraction: false })).toBe('25%');
    expect(formatPercent(12.34, { fraction: false, digits: 1 })).toBe('12.3%');
  });

  it('renders non-finite values as an en dash', () => {
    expect(formatPercent(NaN)).toBe('–');
  });
});

describe('formatSeconds', () => {
  it('formats sub-minute values with trimmed decimals', () => {
    expect(formatSeconds(0)).toBe('0 s');
    expect(formatSeconds(1.5)).toBe('1.5 s');
    expect(formatSeconds(30)).toBe('30 s');
    expect(formatSeconds(2.456)).toBe('2.46 s');
  });

  it('breaks longer values into hours, minutes and seconds', () => {
    expect(formatSeconds(60)).toBe('1 min');
    expect(formatSeconds(90)).toBe('1 min 30 s');
    expect(formatSeconds(3600)).toBe('1 h');
    expect(formatSeconds(3661)).toBe('1 h 1 min 1 s');
  });

  it('renders negative or non-finite values as an en dash', () => {
    expect(formatSeconds(-1)).toBe('–');
    expect(formatSeconds(NaN)).toBe('–');
  });
});
