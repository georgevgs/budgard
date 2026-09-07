import type { ColumnMapping, CsvPreviewData } from '@/common/components/csvImport/utils/csvTypes';

// A cell is a negative number, not merely a string that starts with a dash.
export const isNegativeCell = (cell: string): boolean => {
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
