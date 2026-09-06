import { isNegativeCell } from '@/pages/expenses/utils/csvColumns';
import type { CsvPreviewData } from '@/pages/expenses/utils/csvTypes';

/**
 * Detects the delimiter used in a CSV file (comma or semicolon)
 */
export const detectDelimiter = (firstLine: string): string => {
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

/**
 * Checks if a line looks like a header row
 */
export const isHeaderRow = (line: string): boolean => {
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
export const parseCsvLine = (line: string, delimiter: string = ','): string[] => {
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
