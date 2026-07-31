import { describe, it, expect, afterEach } from 'vitest';
import {
  cn,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  formatForeignAmount,
  formatCurrencyInput,
  parseCurrencyInput,
  extractEmoji,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('resolves Tailwind conflicts by keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    const condition = false;
    expect(cn('base', condition && 'hidden', 'end')).toBe('base end');
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

describe('formatCurrencyCompact', () => {
  it('drops decimals for axis ticks', () => {
    expect(formatCurrencyCompact(1234.56)).toBe('1.235€');
  });

  it('keeps the de-DE thousand separator', () => {
    expect(formatCurrencyCompact(999999)).toBe('999.999€');
  });

  it('formats zero', () => {
    expect(formatCurrencyCompact(0)).toBe('0€');
  });
});

describe('formatPercent', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('uses a dot decimal separator in English', () => {
    document.documentElement.lang = 'en';
    expect(formatPercent(12.34)).toBe('12.3');
  });

  it('uses a comma decimal separator in Greek', () => {
    document.documentElement.lang = 'el';
    expect(formatPercent(12.34)).toBe('12,3');
  });

  it('respects the requested decimal precision', () => {
    document.documentElement.lang = 'en';
    expect(formatPercent(5.678, 2)).toBe('5.68');
    expect(formatPercent(5.678, 0)).toBe('6');
  });

  it('pads to the requested precision', () => {
    document.documentElement.lang = 'el';
    expect(formatPercent(7, 2)).toBe('7,00');
  });

  it('keeps the sign of negative values', () => {
    document.documentElement.lang = 'en';
    expect(formatPercent(-3.1)).toBe('-3.1');
  });

  it('falls back to English when the language is unset', () => {
    expect(formatPercent(1.5)).toBe('1.5');
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

describe('extractEmoji', () => {
  it('extracts a single emoji from plain input', () => {
    expect(extractEmoji('🍔')).toBe('🍔');
  });

  it('extracts emoji from mixed text', () => {
    expect(extractEmoji('hello🍔world')).toBe('🍔');
  });

  it('returns empty string for plain text', () => {
    expect(extractEmoji('hello world')).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(extractEmoji('')).toBe('');
  });

  it('returns empty string for numbers only', () => {
    expect(extractEmoji('12345')).toBe('');
  });

  it('extracts multiple emojis', () => {
    expect(extractEmoji('🍔🍕')).toBe('🍔🍕');
  });

  it('truncates to 4 characters max', () => {
    expect(extractEmoji('🍔🍕🎮🎬🎵').length).toBeLessThanOrEqual(4);
  });

  it('handles compound emojis with ZWJ', () => {
    const result = extractEmoji('👨‍👩‍👧');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles emojis with variation selectors', () => {
    expect(extractEmoji('✈️')).toBeTruthy();
  });

  it('strips special characters and keeps only emoji', () => {
    expect(extractEmoji('<script>🍔</script>')).toBe('🍔');
  });

  it('strips whitespace and keeps only emoji', () => {
    expect(extractEmoji('  🏠  ')).toBe('🏠');
  });
});

describe('formatForeignAmount', () => {
  it('formats USD with dollar sign', () => {
    const result = formatForeignAmount(85, 'USD');
    expect(result).toContain('85');
    expect(result).toContain('$');
  });

  it('formats GBP with pound sign', () => {
    const result = formatForeignAmount(50.5, 'GBP');
    expect(result).toContain('50');
    expect(result).toContain('£');
  });

  it('formats JPY without decimal places', () => {
    const result = formatForeignAmount(1500, 'JPY');
    expect(result).toContain('1.500');
    expect(result).not.toMatch(/,\d{2}/);
  });

  it('formats amounts with two decimal places for standard currencies', () => {
    const result = formatForeignAmount(78.2, 'USD');
    expect(result).toMatch(/78,20/);
  });

  it('uses the same separator convention as formatCurrency', () => {
    const result = formatForeignAmount(1234.56, 'USD');
    expect(result).toContain('1.234,56');
  });

  it('falls back gracefully for unknown currency codes', () => {
    const result = formatForeignAmount(100, 'XYZ');
    expect(result).toContain('100');
  });
});
