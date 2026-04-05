import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatForeignAmount,
  formatCurrencyInput,
  parseCurrencyInput,
  extractEmoji,
  dataUrlToBlob,
} from './utils';

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

describe('dataUrlToBlob', () => {
  it('returns a Blob with the correct MIME type', () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const base64 = btoa(String.fromCharCode(...bytes));
    const blob = dataUrlToBlob(`data:image/png;base64,${base64}`);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('produces a non-empty blob', () => {
    const base64 = btoa('test');
    const blob = dataUrlToBlob(`data:image/png;base64,${base64}`);
    expect(blob.size).toBe(4);
  });

  it('handles jpeg data URLs', () => {
    const base64 = btoa('jpeg-data');
    const blob = dataUrlToBlob(`data:image/jpeg;base64,${base64}`);
    expect(blob.type).toBe('image/jpeg');
  });

  it('defaults to image/png when MIME is missing', () => {
    const base64 = btoa('x');
    const blob = dataUrlToBlob(`data:;base64,${base64}`);
    expect(blob.type).toBe('image/png');
  });

  it('preserves binary content correctly', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    const base64 = btoa(String.fromCharCode(...bytes));
    const blob = dataUrlToBlob(`data:application/octet-stream;base64,${base64}`);
    expect(blob.size).toBe(5);
    expect(blob.type).toBe('application/octet-stream');
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
    expect(result).toContain('1,500');
    expect(result).not.toMatch(/\.\d{2}/);
  });

  it('formats amounts with two decimal places for standard currencies', () => {
    const result = formatForeignAmount(78.2, 'USD');
    expect(result).toMatch(/78\.20/);
  });

  it('falls back gracefully for unknown currency codes', () => {
    const result = formatForeignAmount(100, 'XYZ');
    expect(result).toContain('100');
  });
});
