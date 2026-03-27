import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('resolves Tailwind conflicts by keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'end')).toBe('base end');
  });
});

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0,00€');
  });

  it('formats small amounts with two decimals', () => {
    expect(formatCurrency(5.5)).toBe('5,50€');
  });

  it('formats thousands with dot separator', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56€');
  });

  it('formats large amounts', () => {
    expect(formatCurrency(999999.99)).toBe('999.999,99€');
  });

  it('rounds to two decimal places', () => {
    expect(formatCurrency(10.999)).toBe('11,00€');
  });
});

describe('formatCurrencyInput', () => {
  it('passes through simple digits', () => {
    expect(formatCurrencyInput('123')).toBe('123');
  });

  it('strips non-digit non-comma characters', () => {
    expect(formatCurrencyInput('12€ab')).toBe('12');
  });

  it('adds thousand separators for 4+ digits', () => {
    expect(formatCurrencyInput('1234')).toBe('1.234');
  });

  it('adds thousand separators for large numbers', () => {
    expect(formatCurrencyInput('1234567')).toBe('1.234.567');
  });

  it('preserves comma and limits decimals to 2 digits', () => {
    expect(formatCurrencyInput('123,456')).toBe('123,45');
  });

  it('handles comma with no decimals', () => {
    expect(formatCurrencyInput('50,')).toBe('50,');
  });

  it('returns empty string for empty input', () => {
    expect(formatCurrencyInput('')).toBe('');
  });
});

describe('parseCurrencyInput', () => {
  it('parses simple number', () => {
    expect(parseCurrencyInput('100')).toBe(100);
  });

  it('parses European format with comma decimal', () => {
    expect(parseCurrencyInput('123,45')).toBe(123.45);
  });

  it('parses European format with thousand separators', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseCurrencyInput('')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parseCurrencyInput('abc')).toBe(0);
  });
});
