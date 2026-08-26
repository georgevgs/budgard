import { roundMoney } from '@/lib/money';
import type { Category } from '@/types/Category';
import { SAFE_STRING } from '@/lib/validations';

export type ParsedExpenseRow = {
  date: string;
  description: string;
  categoryName: string;
  amount: number;
  rowNumber: number;
  // True when the row's amount marks it as income (bank +/- convention or an
  // explicit + prefix). Imported as an income transaction unless skipped.
  isIncome: boolean;
};

export type ColumnMapping = {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  categoryColumn: number | null; // Optional
};

export type CsvPreviewData = {
  headers: string[];
  sampleRows: string[][];
  delimiter: string;
  totalRows: number;
  // Indices of columns that contain at least one negative number. The amount
  // column's membership decides the sign convention; other columns are none
  // of the amount's business.
  negativeColumns: Set<number>;
};

type CsvParseResult = {
  validRows: ParsedExpenseRow[];
  errors: CsvParseError[];
  unmatchedCategories: string[];
  skippedIncomeCount: number;
};

// messageKey is an i18n key (import.rowErrors.*) resolved at render time,
// so row errors follow the app language like every other user-facing string.
export type CsvParseError = {
  rowNumber: number;
  field: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  rawValue: string;
};

/**
 * Detects the delimiter used in a CSV file (comma or semicolon)
 */
const detectDelimiter = (firstLine: string): string => {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  if (semicolonCount > commaCount) {
    return ';';
  }

  return ',';
};

/**
 * Gets preview data from CSV for column mapping UI
 */
export const getCsvPreviewData = (csvContent: string): CsvPreviewData => {
  const lines = csvContent.trim().split(/\r?\n/);
  let delimiter = ',';
  if (lines.length > 0) {
    delimiter = detectDelimiter(lines[0]);
  }

  const allRows = lines
    .filter((line) => line.trim())
    .map((line) => parseCsvLine(line, delimiter));

  // First row is headers
  const headers = allRows[0] || [];

  // Get sample data rows (skip header, take up to 5)
  const sampleRows = allRows.slice(1, 6);

  // Count total data rows (excluding header and empty rows at end)
  const dataRows = allRows
    .slice(1)
    .filter((row) =>
      row.some((cell) => cell.trim().replace(/^["']+|["']+$/g, '')),
    );
  const totalRows = dataRows.length;

  // Which columns contain negative numbers. Previously this was a single flag
  // set by ANY cell in ANY column — a running-balance column, a "-5%" in a
  // description, one refund row — and that flag decided, for the whole file,
  // whether an unsigned amount was an expense or an income. One stray minus
  // sign turned five hundred expenses into five hundred incomes.
  //
  // Recording it per column lets the decision follow the column the user
  // actually maps as the amount, and lets the UI show which way it resolved.
  const negativeColumns = new Set<number>();
  for (const row of dataRows) {
    row.forEach((cell, index) => {
      if (isNegativeCell(cell)) {
        negativeColumns.add(index);
      }
    });
  }

  return {
    headers,
    sampleRows,
    delimiter,
    totalRows,
    negativeColumns,
  };
};

// A cell is a negative number, not merely a string that starts with a dash.
const isNegativeCell = (cell: string): boolean => {
  const cleaned = cell.trim().replace(/[€$£¥\s"']/g, '');

  return /^-\d/.test(cleaned);
};

/**
 * Whether the mapped amount column uses the bank-statement sign convention
 * (negative = money out, positive = money in).
 */
export const usesSignedAmountConvention = (
  preview: Pick<CsvPreviewData, 'negativeColumns'>,
  amountColumn: number,
): boolean => {
  return preview.negativeColumns.has(amountColumn);
};

// The header vocabulary the mapper recognises, English and Greek. A header
// matches a role if it CONTAINS one of these, so "Value date" matches both
// date and amount — which is why the scan keeps the last match rather than
// stopping at the first.
const HEADER_KEYWORDS = {
  date: ['date', 'ημ/νια', 'ημερομηνια'],
  description: ['description', 'περιγραφη', 'details', 'memo', 'payee'],
  amount: ['amount', 'ποσο', 'sum', 'value'],
  category: ['category', 'κατηγορια', 'type'],
} as const;

// A category column is short, repetitive text — anything longer than this on
// average is prose, not a label.
const MAX_CATEGORY_LENGTH = 30;

/**
 * Suggests column mapping based on header names and content
 */
export const suggestColumnMapping = (
  preview: CsvPreviewData,
): ColumnMapping => {
  const { headers } = preview;

  const dateColumn = matchHeader(headers, HEADER_KEYWORDS.date, 0);
  const descriptionColumn = matchHeader(
    headers,
    HEADER_KEYWORDS.description,
    1,
  );
  const amountColumn = matchHeader(
    headers,
    HEADER_KEYWORDS.amount,
    headers.length - 1,
  );

  const byHeader = matchHeader(headers, HEADER_KEYWORDS.category, null);
  let categoryColumn = byHeader;

  // No category header — fall back to looking for a column that behaves like
  // one, skipping the three already spoken for.
  if (categoryColumn === null) {
    categoryColumn = detectCategoryByContent(preview, [
      dateColumn,
      descriptionColumn,
      amountColumn,
    ]);
  }

  return {
    dateColumn,
    descriptionColumn,
    amountColumn,
    categoryColumn,
  };
};

/**
 * Parses a CSV string into expense data using column mapping
 *
 * @param csvContent - The CSV file content
 * @param categories - User's categories for matching
 * @param columnMapping - Which columns contain which data
 * @param skipIncomeTransactions - Whether to skip income transactions
 * @param signedConvention - If true, the mapped amount column uses the bank
 *   statement convention where negative = expense, positive = income
 */
export const parseExpensesCsv = (
  csvContent: string,
  categories: Category[],
  columnMapping: ColumnMapping,
  skipIncomeTransactions: boolean = true,
  signedConvention: boolean = false,
): CsvParseResult => {
  const lines = csvContent.trim().split(/\r?\n/);
  const validRows: ParsedExpenseRow[] = [];
  const errors: CsvParseError[] = [];
  const unmatchedCategoriesSet = new Set<string>();
  let skippedIncomeCount = 0;

  const categoryMap = new Map(
    categories.map((cat) => [cat.name.toLowerCase(), cat]),
  );
  let delimiter = ',';
  if (lines.length > 0) {
    delimiter = detectDelimiter(lines[0]);
  }

  let startIndex = 0;
  if (isHeaderRow(lines[0])) {
    startIndex = 1;
  }
  const { dateColumn, descriptionColumn, amountColumn, categoryColumn } =
    columnMapping;
  const minColumns =
    Math.max(dateColumn, descriptionColumn, amountColumn, categoryColumn ?? 0) +
    1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const rowNumber = i + 1;
    const fields = parseCsvLine(line, delimiter);
    const outcome = processRow(
      fields,
      line,
      rowNumber,
      columnMapping,
      minColumns,
      categoryMap,
      signedConvention,
      skipIncomeTransactions,
    );

    if (outcome.kind === 'income') {
      skippedIncomeCount++;
    } else if (outcome.kind === 'error') {
      errors.push(outcome.error);
    } else if (outcome.kind === 'valid') {
      if (outcome.unmatchedCategory) {
        unmatchedCategoriesSet.add(outcome.unmatchedCategory);
      }
      validRows.push(outcome.row);
    }
    // 'empty' → do nothing
  }

  return {
    validRows,
    errors,
    unmatchedCategories: Array.from(unmatchedCategoriesSet),
    skippedIncomeCount,
  };
};

/**
 * Maps parsed rows to expense data ready for insertion
 */
export const mapRowsToExpenses = (
  rows: ParsedExpenseRow[],
  categories: Category[],
  categoryMappings: Map<string, string | null>, // Maps category name to category_id or null
): Array<{
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
}> => {
  const categoryMap = new Map(
    categories.map((cat) => [cat.name.toLowerCase(), cat.id]),
  );

  return rows
    .filter((row) => !row.isIncome)
    .map((row) => {
      let categoryId: string | null = null;

      if (row.categoryName) {
        // First check if there's a manual mapping
        if (categoryMappings.has(row.categoryName)) {
          categoryId = categoryMappings.get(row.categoryName) || null;
        } else {
          // Fall back to existing category lookup
          categoryId = categoryMap.get(row.categoryName.toLowerCase()) || null;
        }
      }

      return {
        date: row.date,
        description: row.description,
        amount: row.amount,
        category_id: categoryId,
      };
    });
};

/**
 * Maps parsed income rows to income data ready for insertion. CSV category
 * names refer to expense categories, so imported incomes start uncategorized.
 */
export const mapRowsToIncomes = (
  rows: ParsedExpenseRow[],
): Array<{
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
}> => {
  return rows
    .filter((row) => row.isIncome)
    .map((row) => ({
      date: row.date,
      description: row.description,
      amount: row.amount,
      category_id: null,
    }));
};

/**
 * Reads a file and returns its content as text
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type RowOutcome =
  | { kind: 'valid'; row: ParsedExpenseRow; unmatchedCategory: string | null }
  | { kind: 'error'; error: CsvParseError }
  | { kind: 'empty' }
  | { kind: 'income' };

const processRow = (
  fields: string[],
  rawLine: string,
  rowNumber: number,
  columnMapping: ColumnMapping,
  minColumns: number,
  categoryMap: Map<string, Category>,
  signedConvention: boolean,
  skipIncomeTransactions: boolean,
): RowOutcome => {
  const { dateColumn, descriptionColumn, amountColumn, categoryColumn } =
    columnMapping;

  if (fields.length < minColumns) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'row',
        messageKey: 'import.rowErrors.tooFewColumns',
        messageParams: { count: minColumns },
        rawValue: rawLine,
      },
    };
  }

  const dateStr = fields[dateColumn];
  const description = fields[descriptionColumn];
  const amountStr = fields[amountColumn];
  let categoryName = '';
  if (categoryColumn !== null) {
    categoryName = fields[categoryColumn];
  }

  // Skip empty/metadata rows (common at end of bank exports)
  const trimmedDate = dateStr.trim().replace(/^["']+|["']+$/g, '');
  if (!trimmedDate) return { kind: 'empty' };

  const date = parseDate(trimmedDate);
  if (!date) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'date',
        messageKey: 'import.rowErrors.invalidDate',
        rawValue: dateStr,
      },
    };
  }

  const descriptionError = validateDescription(description, rowNumber);
  if (descriptionError) return { kind: 'error', error: descriptionError };
  const trimmedDescription = description.trim();

  const { amount, isIncome } = parseAmount(amountStr.trim(), signedConvention);

  if (skipIncomeTransactions && isIncome) return { kind: 'income' };

  // Zero is not a transaction; a negative expense is a refund and is legal.
  if (amount === null || amount === 0) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'amount',
        messageKey: 'import.rowErrors.invalidAmount',
        rawValue: amountStr,
      },
    };
  }

  const MAX_AMOUNT = 1_000_000;
  if (amount > MAX_AMOUNT) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'amount',
        messageKey: 'import.rowErrors.amountTooLarge',
        rawValue: amountStr,
      },
    };
  }

  const trimmedCategory = categoryName.trim();
  const isUncategorized =
    !trimmedCategory || trimmedCategory.toLowerCase() === 'uncategorized';

  let unmatchedCategory: string | null = null;
  if (!isUncategorized && !categoryMap.has(trimmedCategory.toLowerCase())) {
    unmatchedCategory = trimmedCategory;
  }

  let rowCategoryName = trimmedCategory;
  if (isUncategorized) {
    rowCategoryName = '';
  }

  return {
    kind: 'valid',
    row: {
      date,
      description: trimmedDescription,
      categoryName: rowCategoryName,
      amount,
      rowNumber,
      isIncome,
    },
    unmatchedCategory,
  };
};

const validateDescription = (
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
 * Checks if a line looks like a header row
 */
const isHeaderRow = (line: string): boolean => {
  const lower = line.toLowerCase();
  // English headers
  const hasEnglishHeaders =
    lower.includes('date') &&
    lower.includes('description') &&
    (lower.includes('category') || lower.includes('amount'));
  // Greek headers (ΗΜ/ΝΙΑ = date, ΠΕΡΙΓΡΑΦΗ = description, ΠΟΣΟ = amount)
  const hasGreekHeaders =
    lower.includes('ημ/νια') ||
    lower.includes('περιγραφη') ||
    lower.includes('ποσο');

  return hasEnglishHeaders || hasGreekHeaders;
};

/**
 * Parses a CSV line, handling quoted fields
 */
const parseCsvLine = (line: string, delimiter: string = ','): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // Field separator
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Add the last field
  fields.push(current);

  return fields;
};

/**
 * Parses a date string in various formats
 */
const parseDate = (dateStr: string): string | null => {
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
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;

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
const parseAmount = (
  amountStr: string,
  signedConvention: boolean,
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
  if (signedConvention) {
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

  const separator = lastDot === -1 ? ',' : '.';
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

// Index of the LAST header containing one of `keywords`, or `fallback` when
// none do. Last-match-wins is deliberate: in "Date,Value date,..." the second
// column is the one a bank means.
const matchHeader = <T extends number | null>(
  headers: string[],
  keywords: readonly string[],
  fallback: T,
): number | T => {
  let match: number | T = fallback;

  headers.forEach((header, idx) => {
    const lower = header.toLowerCase().replace(/["']/g, '');
    if (keywords.some((keyword) => lower.includes(keyword))) {
      match = idx;
    }
  });

  return match;
};

// A category column typically repeats a small set of short values. Returns the
// first unassigned column that looks that way, or null.
const detectCategoryByContent = (
  preview: CsvPreviewData,
  assigned: number[],
): number | null => {
  const { headers, sampleRows } = preview;
  if (sampleRows.length === 0) {
    return null;
  }

  const distinctByColumn = new Map<number, Set<string>>();
  sampleRows.forEach((row) => {
    row.forEach((cell, idx) => {
      if (!distinctByColumn.has(idx)) {
        distinctByColumn.set(idx, new Set());
      }
      distinctByColumn.get(idx)!.add(cell.trim());
    });
  });

  for (let idx = 0; idx < headers.length; idx++) {
    if (assigned.includes(idx)) {
      continue;
    }

    const values = distinctByColumn.get(idx);
    if (!values) {
      continue;
    }

    // Repeated values are the first signal, short ones the second.
    if (values.size >= sampleRows.length) {
      continue;
    }

    const totalLength = Array.from(values).reduce(
      (sum, v) => sum + v.length,
      0,
    );
    if (totalLength / values.size < MAX_CATEGORY_LENGTH) {
      return idx;
    }
  }

  return null;
};
