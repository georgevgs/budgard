import { roundMoney } from '@/constants/money';
import { SAFE_STRING } from '@/constants/validations';
import type { CsvParseError } from '@/common/components/csvImport/utils/csvTypes';

export const validateDescription = (
  raw: string,
  rowNumber: number,
): CsvParseError | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      rowNumber,
      field: 'description',
      messageKey: 'import.rowErrors.descriptionRequired',
      rawValue: raw,
    };
  }
  if (trimmed.length > 100) {
    return {
      rowNumber,
      field: 'description',
      messageKey: 'import.rowErrors.descriptionTooLong',
      rawValue: raw,
    };
  }
  if (!SAFE_STRING.test(trimmed)) {
    return {
      rowNumber,
      field: 'description',
      messageKey: 'import.rowErrors.descriptionInvalid',
      rawValue: raw,
    };
  }

  return null;
};

/**
 * Parses a date string in various formats
 */
export const parseDate = (dateStr: string): string | null => {
  // Try yyyy-MM-dd format first (exported format)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return dateStr;
    }
  }

  // Try dd/MM/yyyy format (common in Europe)
  const euMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try MM/dd/yyyy format (common in US)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    if (isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Validates a date
 */
const isValidDate = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > 31) {
    return false;
  }
  if (year < 2000 || year > 2100) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

type AmountParseResult = {
  amount: number | null;
  isIncome: boolean;
};

/**
 * Parses an amount from a CSV cell.
 *
 * Two things this has to get right that it previously did not:
 *
 * Thousands separators. Three regexes covered the common shapes and anything
 * else fell through to a bare parseFloat, where "1,234" became 1 and "1.234"
 * became 1.23 — both ordinary whole-euro bank exports, both silently wrong by
 * three orders of magnitude. The separator is now resolved the same way the
 * amount inputs resolve it: whichever of . or , appears last is the decimal
 * point, and a lone separator is a decimal only when 1–2 digits follow it.
 *
 * Sign. Negative expenses are legal now (refunds, adjustments), so a minus no
 * longer just means "expense, take the magnitude". In a bank statement the
 * sign encodes direction, and a magnitude is what should be stored. In any
 * other file the sign is part of the amount, so Budgard's own export
 * round-trips: a -3,50 refund comes back as a -3,50 refund rather than as a
 * +3,50 charge.
 *
 * @param amountStr - The amount string to parse
 * @param signedConvention - True when the mapped amount column uses the
 *   bank-statement convention (negative = money out, positive = money in).
 */
export const parseAmount = (
  amountStr: string,
  hasSignedConvention: boolean,
): AmountParseResult => {
  // Currency symbols, spaces, quotes and thin/non-breaking spaces used as
  // grouping separators in some locales.
  let cleaned = amountStr
    .replace(/[€$£¥\s"']/g, '')
    .replace(/[\u00a0\u202f\u2009]/g, '');

  // Trailing-minus notation, used by several bank exports: "1234.56-".
  let trailingMinus = false;
  if (cleaned.endsWith('-')) {
    trailingMinus = true;
    cleaned = cleaned.slice(0, -1);
  }

  // Accounting parentheses: "(1,234.56)" is negative.
  let parenthesised = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    parenthesised = true;
    cleaned = cleaned.slice(1, -1);
  }

  const hasMinusSign =
    cleaned.startsWith('-') || trailingMinus || parenthesised;
  const hasPlusSign = cleaned.startsWith('+');

  if (cleaned.startsWith('-') || hasPlusSign) {
    cleaned = cleaned.substring(1);
  }

  const magnitude = parseFloat(normalizeSeparators(cleaned));

  if (!Number.isFinite(magnitude)) {
    return { amount: null, isIncome: false };
  }

  const rounded = roundMoney(magnitude);

  // Bank statement: the sign is the direction, so store the magnitude and
  // record which side it fell on.
  if (hasSignedConvention) {
    return { amount: rounded, isIncome: !hasMinusSign };
  }

  // Everything else: an explicit + means income; otherwise the sign belongs to
  // the amount, so a refund stays negative.
  if (hasPlusSign) {
    return { amount: rounded, isIncome: true };
  }

  if (hasMinusSign) {
    return { amount: -rounded, isIncome: false };
  }

  return { amount: rounded, isIncome: false };
};

/**
 * Rewrites an amount so the decimal point is a dot and grouping separators are
 * gone, whichever convention the file used.
 *
 *   both separators   the rightmost is the decimal point — no convention puts
 *                     the grouping separator last
 *   one separator     a decimal point only when exactly one of it appears with
 *                     1–2 digits after; "1,234" and "1.234" group thousands,
 *                     "1,23" and "1.5" are decimals
 *
 * Deliberately stricter than lib/utils.ts, which leaves a lone comma alone
 * because the amount inputs are de-DE and a typed comma is always a decimal
 * point. A file has no such guarantee.
 */
const normalizeSeparators = (value: string): string => {
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');

  if (lastDot === -1 && lastComma === -1) {
    return value;
  }

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      return value.replace(/\./g, '').replace(',', '.');
    }

    return value.replace(/,/g, '');
  }

  let separator = '.';
  if (lastDot === -1) {
    separator = ',';
  }
  if (isDecimalSeparator(value, separator)) {
    return value.replace(separator, '.');
  }

  return value.split(separator).join('');
};

// A lone separator marks decimals only when it appears once with one or two
// digits after it. Anything else is thousands grouping.
const isDecimalSeparator = (value: string, separator: string): boolean => {
  const first = value.indexOf(separator);
  if (first !== value.lastIndexOf(separator)) {
    return false;
  }

  const fraction = value.slice(first + 1);

  return /^\d{1,2}$/.test(fraction);
};
