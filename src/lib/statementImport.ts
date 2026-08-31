import type { ParsedExpenseRow } from '@/lib/csvImport';

// Two formats every bank can export but almost no budgeting app reads, which
// is why "download a CSV and map the columns by hand" is still the norm.
//
// Both are read into the same ParsedExpenseRow the CSV importer already
// produces, so everything downstream — the preview, the category mapping, the
// review queue, the write — is shared. A second import pipeline would be a
// second place for those decisions to drift.

export type StatementFormat = 'ofx' | 'qif';

export type StatementParseResult = {
  format: StatementFormat;
  rows: ParsedExpenseRow[];
  // Rows the file contained but that could not be read. Reported rather than
  // dropped: silently importing 340 of 341 transactions is worse than saying
  // which one was skipped.
  skipped: number;
};

export const detectStatementFormat = (
  fileName: string,
  content: string,
): StatementFormat | null => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.ofx') || name.endsWith('.qfx')) {
    return 'ofx';
  }
  if (name.endsWith('.qif')) {
    return 'qif';
  }
  // Some banks serve either format as .txt, so fall back to the contents.
  if (content.includes('<STMTTRN>') || content.includes('<OFX>')) {
    return 'ofx';
  }
  if (/^!Type:/im.test(content)) {
    return 'qif';
  }

  return null;
};

export const parseStatement = (
  format: StatementFormat,
  content: string,
): StatementParseResult => {
  if (format === 'ofx') {
    return parseOfx(content);
  }

  return parseQif(content);
};

// --- OFX ---

// OFX is SGML rather than XML: tags are frequently unclosed, so a real parser
// refuses it. Reading the fields positionally is what banks' own tooling does.
const OFX_TRANSACTION = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;

const parseOfx = (content: string): StatementParseResult => {
  const rows: ParsedExpenseRow[] = [];
  let skipped = 0;

  for (const match of content.matchAll(OFX_TRANSACTION)) {
    const block = match[1];
    const date = ofxDate(readTag(block, 'DTPOSTED'));
    const amount = Number.parseFloat(readTag(block, 'TRNAMT') ?? '');

    if (!date || !Number.isFinite(amount)) {
      skipped += 1;
      continue;
    }

    rows.push({
      date,
      amount: Math.abs(amount),
      // NAME is the counterparty; MEMO is the bank's own annotation. Prefer
      // the former, because "TESCO STORES 3428" beats "CARD PAYMENT".
      description: readTag(block, 'NAME') ?? readTag(block, 'MEMO') ?? '',
      // Neither format carries a category the app could trust, so every row
      // arrives uncategorised and goes through the same mapping step the CSV
      // importer already offers.
      categoryName: '',
      rowNumber: rows.length + 1,
      // A positive OFX amount is money arriving.
      isIncome: amount > 0,
    });
  }

  return { format: 'ofx', rows, skipped };
};

// Values run to the next tag or line end, since the closing tag is optional.
const readTag = (block: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i').exec(block);
  if (!match) {
    return null;
  }

  return match[1].trim() || null;
};

// OFX dates are YYYYMMDD, optionally followed by a time and a bracketed zone
// offset. Only the calendar date matters here, and taking it as written avoids
// a transaction sliding a day when the zone is read.
const ofxDate = (raw: string | null): string | null => {
  if (!raw || raw.length < 8) {
    return null;
  }

  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  if (!isCalendarDate(year, month, day)) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

// --- QIF ---

const parseQif = (content: string): StatementParseResult => {
  const rows: ParsedExpenseRow[] = [];
  let skipped = 0;

  // Records are separated by a lone caret. The leading !Type header is not a
  // record and produces no fields, so it falls out on its own.
  for (const record of content.split(/^\^\s*$/m)) {
    const fields = qifFields(record);
    if (fields.size === 0) {
      continue;
    }

    const date = qifDate(fields.get('D'));
    const amount = parseQifAmount(fields.get('T'));

    if (!date || !Number.isFinite(amount)) {
      skipped += 1;
      continue;
    }

    rows.push({
      date,
      amount: Math.abs(amount),
      description: fields.get('P') ?? fields.get('M') ?? '',
      // QIF does carry a category on the L line, but it is the exporting
      // app's taxonomy rather than the user's — it goes through the same
      // mapping step instead of being trusted.
      categoryName: fields.get('L') ?? '',
      rowNumber: rows.length + 1,
      isIncome: amount > 0,
    });
  }

  return { format: 'qif', rows, skipped };
};

// A comma in a QIF amount is either a decimal separator (24,50 — European)
// or a thousands separator (1,234.56 — Anglo). Stripping commas outright,
// which is the obvious thing to write, silently turns €24,50 into €2450.
//
// The rule: whichever of "," and "." appears last is the decimal separator,
// and everything else is grouping. A lone comma followed by exactly two
// digits at the end of the string is decimal; anything else is grouping.
const parseQifAmount = (raw: string | undefined): number => {
  if (!raw) {
    return Number.NaN;
  }

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) {
    return Number.parseFloat(cleaned);
  }

  const decimalAt = Math.max(lastComma, lastDot);
  const decimals = cleaned.length - decimalAt - 1;
  // Three digits after the only separator is grouping, not a decimal —
  // "1,234" is a thousand, not one and a bit.
  if (lastComma === -1 || lastDot === -1) {
    if (decimals === 3) {
      return Number.parseFloat(cleaned.replace(/[,.]/g, ''));
    }
  }

  const whole = cleaned.slice(0, decimalAt).replace(/[,.]/g, '');
  const fraction = cleaned.slice(decimalAt + 1);

  return Number.parseFloat(`${whole}.${fraction}`);
};

const qifFields = (record: string): Map<string, string> => {
  const fields = new Map<string, string>();
  for (const line of record.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length < 2 || trimmed.startsWith('!')) {
      continue;
    }
    // First field wins: a record with two payee lines is malformed, and the
    // first is the one the bank meant.
    const code = trimmed[0];
    if (!fields.has(code)) {
      fields.set(code, trimmed.slice(1).trim());
    }
  }

  return fields;
};

// QIF dates are the format's worst feature: D/M/Y and M/D/Y are both common,
// separators vary, and years are often two digits. An ambiguous date is
// resolved as day-first, because QIF is overwhelmingly a European export here
// and guessing US order would silently move most transactions.
const qifDate = (raw: string | undefined): string | null => {
  if (!raw) {
    return null;
  }

  const parts = raw.split(/[/'\-.]/).map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const [first, second, rawYear] = parts;
  const year = expandYear(rawYear);
  const day = first.padStart(2, '0');
  const month = second.padStart(2, '0');

  // A first part above 12 can only be a day, which confirms day-first. A
  // second part above 12 means the file is month-first after all.
  if (Number(second) > 12) {
    const swapped = {
      day: second.padStart(2, '0'),
      month: first.padStart(2, '0'),
    };
    if (!isCalendarDate(year, swapped.month, swapped.day)) {
      return null;
    }

    return `${year}-${swapped.month}-${swapped.day}`;
  }

  if (!isCalendarDate(year, month, day)) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

// Two-digit years: a statement is a record of the past, so 70-99 is the
// twentieth century and everything else this one.
const expandYear = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 4) {
    return digits;
  }
  const short = Number(digits);
  if (short >= 70) {
    return String(1900 + short);
  }

  return String(2000 + short);
};

// --- Shared ---

const isCalendarDate = (year: string, month: string, day: string): boolean => {
  const parsed = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  // Rejects 31 February, which Date would otherwise roll into March.
  return parsed.getUTCDate() === Number(day);
};
