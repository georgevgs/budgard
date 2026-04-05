import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from './currencies';

describe('SUPPORTED_CURRENCIES', () => {
  it('has EUR as the first entry', () => {
    expect(SUPPORTED_CURRENCIES[0].code).toBe('EUR');
  });

  it('includes common travel currencies', () => {
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('GBP');
    expect(codes).toContain('JPY');
    expect(codes).toContain('CHF');
  });

  it('every entry has a 3-letter ISO code', () => {
    for (const c of SUPPORTED_CURRENCIES) {
      expect(c.code).toHaveLength(3);
    }
  });

  it('every entry has a non-empty symbol and name', () => {
    for (const c of SUPPORTED_CURRENCIES) {
      expect(c.symbol.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});

describe('getCurrencySymbol', () => {
  it('returns € for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns £ for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('returns ¥ for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('falls back to the code itself for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });

  it('falls back to the code for empty string', () => {
    expect(getCurrencySymbol('')).toBe('');
  });
});
