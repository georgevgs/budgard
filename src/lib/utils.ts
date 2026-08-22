import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getCurrencyDecimals, getCurrencySymbol } from '@/lib/currencies';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// Same de-DE separator convention as formatCurrency, so an original-currency
// line stacked under the converted amount reads with identical number format.
export const formatForeignAmount = (amount: number, currencyCode: string): string => {
  const decimals = getCurrencyDecimals(currencyCode);

  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${amount.toFixed(decimals)} ${currencyCode}`;
  }
};

// Decimals follow the currency's ISO 4217 minor unit, so a yen amount reads
// "¥1.250" rather than the "¥1.250,00" that a two-decimal default would print
// for a currency that has no cents.
export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  const decimals = getCurrencyDecimals(currencyCode);
  const formatted = amount.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatted + getCurrencySymbol(currencyCode);
};

// Axis-tick variant of formatCurrency: same de-DE separators so chart axes
// agree with tooltips, but without decimals to keep tick labels narrow.
export const formatCurrencyCompact = (amount: number, currencyCode: string = 'EUR'): string => {
  const formatted = amount.toLocaleString('de-DE', {
    maximumFractionDigits: 0,
  });

  return formatted + getCurrencySymbol(currencyCode);
};

// Localized percent number without the % sign, so callers can compose it with
// their own suffix or translation template. Keyed off the app language via
// <html lang>, which src/lib/i18n.ts keeps in sync (importing the i18n module
// here would drag its init side effects into every consumer of utils).
export const formatPercent = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat(resolvePercentLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const resolvePercentLocale = (): string => {
  if (document.documentElement.lang === 'el') {
    return 'el-GR';
  }

  return 'en-US';
};

export const formatCurrencyInput = (value: string): string => {
  // Resolve which separator the caller meant as the decimal point before
  // stripping anything — see resolveDecimalSeparator. Without this a pasted
  // "1,234.56" loses its dot as punctuation and reads as 1,23.
  const normalized = normalizeAmountSeparators(value);

  // Remove everything except digits and comma
  const cleaned = normalized.replace(/[^\d,]/g, '');

  // Split into whole and decimal parts
  const parts = cleaned.split(',');
  let whole = parts[0] || '';
  let decimal = parts[1] || '';

  // Limit decimal to 2 digits
  if (decimal.length > 2) {
    decimal = decimal.slice(0, 2);
  }

  // Add thousand separators to whole number
  if (whole.length > 3) {
    whole = whole.replace(/(\d)(?=(\d{3})+$)/g, '$1.');
  }

  // Combine parts
  if (parts.length > 1) {
    return whole + ',' + decimal;
  }

  return whole;
};

export const parseCurrencyInput = (value: string): number => {
  // Convert from European format (1.234,56) to number
  const cleaned = normalizeAmountSeparators(value)
    .replace(/[^\d,-]/g, '') // Drop thousand separators and stray characters
    .replace(',', '.'); // Convert decimal comma to dot

  return parseFloat(cleaned) || 0;
};

/**
 * A stored amount rendered as the masked string the amount inputs expect.
 *
 * Every form that pre-fills an amount needs this, and calling
 * `formatCurrencyInput(value.toString())` instead is the bug it exists to
 * prevent: `toString()` emits a dot, which the mask reads as a thousands
 * separator, so 250.5 pre-fills as "2.505" and saves back as 2505.
 */
export const amountToInput = (
  value: number | null | undefined,
  currencyCode: string = 'EUR',
): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (!Number.isFinite(value)) {
    return '';
  }

  const decimals = getCurrencyDecimals(currencyCode);
  const fixed = Math.abs(value).toFixed(decimals);

  return formatCurrencyInput(fixed.replace('.', ','));
};

/**
 * Rewrites an amount so its decimal separator is always a comma, whatever
 * convention it arrived in.
 *
 * The app's inputs are de-DE: dot groups thousands, comma marks decimals. But
 * amounts arrive from three other places — a pasted US figure, a bank export,
 * and a number's own `toString()` — where the dot is the decimal point. Being
 * wrong about which is which is a factor-of-100 error, so the rule is decided
 * once, here:
 *
 *   both separators present  the rightmost one is the decimal point, because
 *                            no convention puts the grouping separator last
 *   only commas              already de-DE, leave it alone
 *   only dots, one of them,
 *   with 1–2 digits after    a decimal point ("12.50", "250.5")
 *   only dots, otherwise     thousands grouping ("1.234", "1.234.567")
 *
 * A lone trailing separator ("50,") is kept as typed so the mask does not
 * fight someone mid-keystroke.
 */
const normalizeAmountSeparators = (value: string): string => {
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');

  if (lastDot === -1) {
    return value;
  }

  if (lastComma > lastDot) {
    // "1.234,56" — dots are grouping, comma already marks the decimal.
    return value.replace(/\./g, '');
  }

  if (lastComma !== -1) {
    // "1,234.56" — commas are grouping, the dot marks the decimal.
    return value.replace(/,/g, '').replace('.', ',');
  }

  if (isDotDecimal(value, lastDot)) {
    return value.replace('.', ',');
  }

  return value.replace(/\./g, '');
};

const isDotDecimal = (value: string, lastDot: number): boolean => {
  if (value.indexOf('.') !== lastDot) {
    return false;
  }

  const fraction = value.slice(lastDot + 1);
  if (!/^\d*$/.test(fraction)) {
    return false;
  }

  return fraction.length > 0 && fraction.length <= 2;
};

// Strip non-emoji characters so the input only accepts emoji.
// ZWJ (\u{200D}) and variation selectors (\u{FE0F}) are matched individually
// so that join() reconstructs full emoji sequences (e.g. family emoji).
/* eslint-disable no-misleading-character-class */
const EMOJI_PATTERN =
  /[\p{Emoji_Presentation}\p{Extended_Pictographic}\u{200D}\u{FE0F}]/gu;
/* eslint-enable no-misleading-character-class */

export const extractEmoji = (input: string): string => {
  const matches = input.match(EMOJI_PATTERN);
  if (!matches) {
    return '';
  }

  return matches.join('').slice(0, 4);
};

// Calendar months elapsed within the given year, relative to `now`.
// Past years return 12, the current year returns the current month (1–12),
// future years return 0. Used as the denominator for year-view "average per month"
// metrics so partial years aren't smeared across 12 calendar months.
export const monthsElapsedInYear = (year: number, now: Date = new Date()): number => {
  const currentYear = now.getFullYear();

  if (year < currentYear) {
    return 12;
  }

  if (year > currentYear) {
    return 0;
  }

  return now.getMonth() + 1;
};
