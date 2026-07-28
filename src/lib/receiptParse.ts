// Heuristics for extracting expense fields from raw receipt OCR text.
//
// Deliberately self-contained: csvImport.ts has private parseDate/parseAmount
// helpers, but their contracts differ (income-sign semantics, ISO-string
// dates) and receipt text needs keyword-driven heuristics that CSV cells
// don't — sharing them would couple two unrelated formats.

export type ParsedReceipt = {
  amount: number | null;
  date: Date | null;
  merchant: string | null;
};

export const parseReceiptText = (text: string): ParsedReceipt => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    amount: extractAmount(lines),
    date: extractDate(lines),
    merchant: extractMerchant(lines),
  };
};

// --- Helpers ---

// Ordered by trustworthiness: a grand total beats a plain total, which beats
// amount-due phrasing, which beats the payment-method lines (cash tendered
// can exceed the actual total, so ΜΕΤΡΗΤΑ/CASH is the last resort).
const AMOUNT_KEYWORD_TIERS = [
  /ΓΕΝ\.?\s*ΣΥΝΟΛΟ|GRAND TOTAL/,
  /ΣΥΝΟΛΟ|TOTAL/,
  /ΠΛΗΡΩΤΕΟ|AMOUNT DUE|BALANCE DUE|TO PAY/,
  /ΚΑΡΤΑ|CARD/,
  /ΜΕΤΡΗΤΑ|CASH/,
];

const AMOUNT_EXCLUSIONS = /ΦΠΑ|VAT|TAX|SUBTOTAL|ΜΕΡΙΚΟ/;

// Money tokens must have exactly two decimals — bare integers on a receipt
// (quantities, ΑΦΜ digits, zip codes) are never safe to read as an amount.
const MONEY_TOKEN = /\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d+[.,]\d{2}/g;

const MAX_AMOUNT = 1000000;

const extractAmount = (lines: string[]): number | null => {
  for (const tier of AMOUNT_KEYWORD_TIERS) {
    const tierValues: number[] = [];

    lines.forEach((line, index) => {
      const normalized = normalizeForMatching(line);

      if (!tier.test(normalized) || AMOUNT_EXCLUSIONS.test(normalized)) {
        return;
      }

      const value = largestMoneyOnLine(line) ?? largestMoneyOnLine(lines[index + 1] ?? '');

      if (value !== null) {
        tierValues.push(value);
      }
    });

    if (tierValues.length > 0) {
      return Math.max(...tierValues);
    }
  }

  const fallbackValues = lines
    .map((line) => largestMoneyOnLine(line))
    .filter((value): value is number => value !== null);

  if (fallbackValues.length === 0) {
    return null;
  }

  return Math.max(...fallbackValues);
};

const largestMoneyOnLine = (line: string): number | null => {
  const tokens = line.match(MONEY_TOKEN) ?? [];
  const values = tokens
    .map((token) => parseMoneyToken(token))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
};

const parseMoneyToken = (token: string): number | null => {
  let cleaned = token;

  if (/^\d{1,3}(?:\.\d{3})+,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else if (/^\d{1,3}(?:,\d{3})+\.\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (!/^\d+\.\d{2}$/.test(cleaned)) {
    return null;
  }

  const value = parseFloat(cleaned);

  if (Number.isNaN(value) || value <= 0 || value > MAX_AMOUNT) {
    return null;
  }

  return Math.round(value * 100) / 100;
};

const DATE_LABEL = /ΗΜΕΡΟΜΗΝΙΑ|ΗΜ\/ΝΙΑ|DATE/;

const ISO_DATE = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/;
const DMY_DATE = /(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?!\d)/;
const DMY_SHORT_DATE = /(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})(?!\d)/;

const extractDate = (lines: string[]): Date | null => {
  const labeledLines = lines.filter((line) => DATE_LABEL.test(normalizeForMatching(line)));

  for (const line of [...labeledLines, ...lines]) {
    const parsed = parseDateFromLine(line);

    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const parseDateFromLine = (line: string): Date | null => {
  const isoMatch = line.match(ISO_DATE);
  if (isoMatch) {
    const candidate = buildValidDate(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]),
      parseInt(isoMatch[3]),
    );

    if (candidate) {
      return candidate;
    }
  }

  const dmyMatch = line.match(DMY_DATE);
  if (dmyMatch) {
    const candidate = buildValidDate(
      parseInt(dmyMatch[3]),
      parseInt(dmyMatch[2]),
      parseInt(dmyMatch[1]),
    );

    if (candidate) {
      return candidate;
    }
  }

  const shortMatch = line.match(DMY_SHORT_DATE);
  if (shortMatch) {
    const candidate = buildValidDate(
      2000 + parseInt(shortMatch[3]),
      parseInt(shortMatch[2]),
      parseInt(shortMatch[1]),
    );

    if (candidate) {
      return candidate;
    }
  }

  return null;
};

// Real-calendar check plus a receipt-plausibility window: nothing beyond
// tomorrow (timezone slack) and nothing older than five years.
const buildValidDate = (year: number, month: number, day: number): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isRealDate) {
    return null;
  }

  const now = new Date();
  const max = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const min = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

  if (date > max || date < min) {
    return null;
  }

  return date;
};

const MERCHANT_CANDIDATE_LINES = 5;
const MERCHANT_BLACKLIST =
  /ΑΦΜ|Α\.Φ\.Μ|ΔΟΥ|Δ\.Ο\.Υ|ΤΗΛ|TEL|PHONE|ΑΠΟΔΕΙΞΗ|RECEIPT|INVOICE|ΤΙΜΟΛΟΓΙΟ|WWW\.|HTTP/;

// Inverse of SAFE_STRING in validations.ts — keep the character class in sync.
const UNSAFE_CHARS = /[^\p{L}\p{N}\s.,!?'"\-/()@#&%+:;]/gu;

const MERCHANT_MAX_LENGTH = 100;

const extractMerchant = (lines: string[]): string | null => {
  for (const line of lines.slice(0, MERCHANT_CANDIDATE_LINES)) {
    if (line.length < 3 || line.length > 40) {
      continue;
    }

    const letterCount = (line.match(/\p{L}/gu) ?? []).length;
    const digitCount = (line.match(/\p{N}/gu) ?? []).length;

    if (letterCount < 3 || digitCount >= letterCount) {
      continue;
    }

    if (MERCHANT_BLACKLIST.test(normalizeForMatching(line))) {
      continue;
    }

    const sanitized = line
      .replace(UNSAFE_CHARS, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MERCHANT_MAX_LENGTH);

    if (sanitized.length >= 3) {
      return sanitized;
    }
  }

  return null;
};

// Uppercases and strips Greek tonos (ΣΎΝΟΛΟ → ΣΥΝΟΛΟ) so keyword regexes
// match accented OCR output.
const normalizeForMatching = (line: string): string =>
  line
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
