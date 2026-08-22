import { describe, it, expect, afterEach } from 'vitest';
import {
  amountToInput,
  cn,
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
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

describe('formatCurrencyInput — separator conventions', () => {
  it('reads a dotted decimal as a decimal, not as thousands', () => {
    // The 100x bug: "250.5" used to mask to "2.505" and parse back as 2505.
    expect(formatCurrencyInput('250.5')).toBe('250,5');
    expect(formatCurrencyInput('1234.56')).toBe('1.234,56');
    expect(formatCurrencyInput('0.99')).toBe('0,99');
  });

  it('still reads dots as thousands when they group', () => {
    expect(formatCurrencyInput('1.234')).toBe('1.234');
    expect(formatCurrencyInput('1.234.567')).toBe('1.234.567');
  });

  it('handles a pasted US-formatted amount', () => {
    expect(formatCurrencyInput('1,234.56')).toBe('1.234,56');
    expect(parseCurrencyInput(formatCurrencyInput('1,234.56'))).toBe(1234.56);
  });

  it('handles a pasted European-formatted amount', () => {
    expect(formatCurrencyInput('1.234,56')).toBe('1.234,56');
    expect(parseCurrencyInput(formatCurrencyInput('1.234,56'))).toBe(1234.56);
  });
});

describe('amountToInput', () => {
  it('round-trips a stored amount through the mask', () => {
    const cases = [0.99, 12.5, 250.5, 1234.56, 1000, 99999.99];
    for (const value of cases) {
      expect(parseCurrencyInput(amountToInput(value))).toBe(value);
    }
  });

  it('pads to the currency minor unit', () => {
    expect(amountToInput(250.5)).toBe('250,50');
    expect(amountToInput(1234.5, 'USD')).toBe('1.234,50');
  });

  it('omits decimals for a zero-decimal currency', () => {
    expect(amountToInput(1250, 'JPY')).toBe('1.250');
  });

  it('returns the magnitude, since the mask has no sign', () => {
    expect(amountToInput(-42.5)).toBe('42,50');
  });

  it('returns empty for absent or unusable values', () => {
    expect(amountToInput(null)).toBe('');
    expect(amountToInput(undefined)).toBe('');
    expect(amountToInput(Number.NaN)).toBe('');
  });
});
