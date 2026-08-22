import { describe, it, expect } from 'vitest';
import {
  convertMoney,
  fromMinorUnits,
  isUsableRate,
  roundMoney,
  roundToDecimals,
  sumAmounts,
  toMinorUnits,
} from '@/lib/money';

describe('roundMoney', () => {
  it('rounds to cents by default', () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(1.235)).toBe(1.24);
  });

  it('rounds half away from zero, symmetrically for refunds', () => {
    // Math.round breaks ties toward +Infinity, so -2.675 would land on -2.67
    // and net differently from its positive twin.
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(-2.675)).toBe(-2.68);
    expect(roundMoney(0.005)).toBe(0.01);
    expect(roundMoney(-0.005)).toBe(-0.01);
  });

  it('survives values that lose a cent to binary floating point', () => {
    // 1.005 * 100 is 100.49999999999999 — the naive round drops a cent.
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(8.165)).toBe(8.17);
    expect(roundMoney(1262.13 * 1.05)).toBe(1325.24);
  });

  it('uses the currency minor unit', () => {
    expect(roundMoney(1234.56, 'JPY')).toBe(1235);
    expect(roundMoney(1234.44, 'JPY')).toBe(1234);
    expect(roundMoney(1234.567, 'USD')).toBe(1234.57);
  });

  it('defaults unknown currencies to two decimals', () => {
    expect(roundMoney(1.005, 'XYZ')).toBe(1.01);
  });

  it('returns zero for non-finite input', () => {
    expect(roundMoney(Number.NaN)).toBe(0);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('keeps zero as zero without a negative sign', () => {
    expect(Object.is(roundMoney(0), 0)).toBe(true);
  });
});

describe('roundToDecimals', () => {
  it('rounds to an explicit precision', () => {
    expect(roundToDecimals(1.23456, 3)).toBe(1.235);
    expect(roundToDecimals(1.5, 0)).toBe(2);
    expect(roundToDecimals(-1.5, 0)).toBe(-2);
  });
});

describe('toMinorUnits / fromMinorUnits', () => {
  it('round-trips cents', () => {
    expect(toMinorUnits(12.34)).toBe(1234);
    expect(fromMinorUnits(1234)).toBe(12.34);
  });

  it('round-trips a zero-decimal currency', () => {
    expect(toMinorUnits(1250, 'JPY')).toBe(1250);
    expect(fromMinorUnits(1250, 'JPY')).toBe(1250);
  });

  it('handles negatives', () => {
    expect(toMinorUnits(-3.5)).toBe(-350);
    expect(fromMinorUnits(-350)).toBe(-3.5);
  });

  it('does not drop a cent on the classic float case', () => {
    expect(toMinorUnits(1.005)).toBe(101);
    expect(toMinorUnits(4.845)).toBe(485);
  });
});

describe('sumAmounts', () => {
  it('sums without floating-point drift', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(0.1 + 0.2).not.toBe(0.3); // the drift this exists to avoid
  });

  it('stays exact over a long ledger', () => {
    const rows = Array.from({ length: 1000 }, () => 0.07);
    expect(sumAmounts(rows)).toBe(70);
  });

  it('nets refunds against charges', () => {
    expect(sumAmounts([49.99, -49.99])).toBe(0);
    expect(sumAmounts([120, -39.95, -0.05])).toBe(80);
  });

  it('returns zero for an empty list', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('convertMoney', () => {
  it('rounds once into the target minor unit', () => {
    expect(convertMoney(100, 0.9234, 'EUR')).toBe(92.34);
    expect(convertMoney(10, 0.006543, 'EUR')).toBe(0.07);
  });

  it('produces whole yen for a zero-decimal target', () => {
    expect(convertMoney(100, 172.456, 'JPY')).toBe(17246);
  });

  it('converts a refund symmetrically with its charge', () => {
    const charge = convertMoney(100, 0.9235, 'EUR');
    const refund = convertMoney(-100, 0.9235, 'EUR');
    expect(charge + refund).toBe(0);
  });
});

describe('isUsableRate', () => {
  it('accepts plausible rates', () => {
    expect(isUsableRate(0.92)).toBe(true);
    expect(isUsableRate(172.45)).toBe(true);
  });

  it('rejects the values that would silently zero an amount', () => {
    expect(isUsableRate(0)).toBe(false);
    expect(isUsableRate(-1)).toBe(false);
    expect(isUsableRate(null)).toBe(false);
    expect(isUsableRate(undefined)).toBe(false);
    expect(isUsableRate(Number.NaN)).toBe(false);
    expect(isUsableRate(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isUsableRate('0.92')).toBe(false);
  });

  it('rejects absurd magnitudes', () => {
    expect(isUsableRate(1e9)).toBe(false);
  });
});
