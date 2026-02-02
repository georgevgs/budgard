import type { Category } from '@/types/Category';

export interface ParsedExpenseRow {
  date: string;
  description: string;
  categoryName: string;
  amount: number;
  rowNumber: number;
}

export interface ColumnMapping {
  dateColumn: number;
  descriptionColumn: number;
  amountColumn: number;
  categoryColumn: number | null; // Optional
}

export interface CsvPreviewData {
  headers: string[];
  sampleRows: string[][];
  delimiter: string;
  totalRows: number;
  hasNegativeAmounts: boolean; // True if CSV contains negative values (bank statement format)
}

export interface CsvParseResult {
  validRows: ParsedExpenseRow[];
  errors: CsvParseError[];
  unmatchedCategories: string[];
  skippedIncomeCount: number;
}

export interface CsvParseError {
  rowNumber: number;
  field: string;
  message: string;
  rawValue: string;
}

/**
 * Detects the delimiter used in a CSV file (comma or semicolon)
 */
function detectDelimiter(firstLine: string): string {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Gets preview data from CSV for column mapping UI
 */
export function getCsvPreviewData(csvContent: string): CsvPreviewData {
  const lines = csvContent.trim().split(/\r?\n/);
  const delimiter = lines.length > 0 ? detectDelimiter(lines[0]) : ',';

  const allRows = lines
    .filter((line) => line.trim())
    .map((line) => parseCsvLine(line, delimiter));

  // First row is headers
  const headers = allRows[0] || [];

  // Get sample data rows (skip header, take up to 5)
  const sampleRows = allRows.slice(1, 6);

  // Count total data rows (excluding header and empty rows at end)
  const dataRows = allRows.slice(1).filter((row) =>
    row.some((cell) => cell.trim().replace(/^["']+|["']+$/g, ''))
  );
  const totalRows = dataRows.length;

  // Check if any cell contains a negative number (indicates bank statement format)
  const hasNegativeAmounts = dataRows.some((row) =>
    row.some((cell) => {
      const cleaned = cell.trim().replace(/[€$£¥\s"']/g, '');
      return cleaned.startsWith('-') && /^-\d/.test(cleaned);
    })
  );

  return {
    headers,
    sampleRows,
    delimiter,
    totalRows,
    hasNegativeAmounts,
  };
}

/**
 * Suggests column mapping based on header names and content
 */
export function suggestColumnMapping(preview: CsvPreviewData): ColumnMapping {
  const { headers, sampleRows } = preview;

  let dateColumn = 0;
  let descriptionColumn = 1;
  let amountColumn = headers.length - 1;
  let categoryColumn: number | null = null;

  // Try to detect columns by header names
  headers.forEach((header, idx) => {
    const lower = header.toLowerCase().replace(/["']/g, '');

    // Date detection
    if (
      lower.includes('date') ||
      lower.includes('ημ/νια') ||
      lower.includes('ημερομηνια')
    ) {
      dateColumn = idx;
    }

    // Description detection
    if (
      lower.includes('description') ||
      lower.includes('περιγραφη') ||
      lower.includes('details') ||
      lower.includes('memo') ||
      lower.includes('payee')
    ) {
      descriptionColumn = idx;
    }

    // Amount detection
    if (
      lower.includes('amount') ||
      lower.includes('ποσο') ||
      lower.includes('sum') ||
      lower.includes('value')
    ) {
      amountColumn = idx;
    }

    // Category detection
    if (
      lower.includes('category') ||
      lower.includes('κατηγορια') ||
      lower.includes('type')
    ) {
      categoryColumn = idx;
    }
  });

  // If no category found by header, try to detect by content
  // Check if any column looks like it could be a category (short text, repeated values)
  if (categoryColumn === null && sampleRows.length > 0) {
    const columnValues: Map<number, Set<string>> = new Map();

    sampleRows.forEach((row) => {
      row.forEach((cell, idx) => {
        if (!columnValues.has(idx)) {
          columnValues.set(idx, new Set());
        }
        columnValues.get(idx)!.add(cell.trim());
      });
    });

    // A category column typically has repeated values and short strings
    // Skip columns already assigned
    for (let idx = 0; idx < headers.length; idx++) {
      if (idx === dateColumn || idx === descriptionColumn || idx === amountColumn) {
        continue;
      }

      const values = columnValues.get(idx);
      if (values && values.size < sampleRows.length) {
        // Has repeated values, might be a category
        const avgLength =
          Array.from(values).reduce((sum, v) => sum + v.length, 0) / values.size;
        if (avgLength < 30) {
          categoryColumn = idx;
          break;
        }
      }
    }
  }

  return {
    dateColumn,
    descriptionColumn,
    amountColumn,
    categoryColumn,
  };
}

/**
 * Parses a CSV string into expense data using column mapping
 *
 * @param csvContent - The CSV file content
 * @param categories - User's categories for matching
 * @param columnMapping - Which columns contain which data
 * @param skipIncomeTransactions - Whether to skip income transactions
 * @param hasNegativeAmounts - If true, CSV uses bank statement convention
 *   where negative = expense, positive = income
 */
export function parseExpensesCsv(
  csvContent: string,
  categories: Category[],
  columnMapping: ColumnMapping,
  skipIncomeTransactions: boolean = true,
  hasNegativeAmounts: boolean = false,
): CsvParseResult {
  const lines = csvContent.trim().split(/\r?\n/);
  const validRows: ParsedExpenseRow[] = [];
  const errors: CsvParseError[] = [];
  const unmatchedCategoriesSet = new Set<string>();
  let skippedIncomeCount = 0;

  // Create category lookup map (case-insensitive)
  const categoryMap = new Map(
    categories.map((cat) => [cat.name.toLowerCase(), cat]),
  );

  // Auto-detect delimiter from first line
  const delimiter = lines.length > 0 ? detectDelimiter(lines[0]) : ',';

  // Skip header row if present
  const startIndex = isHeaderRow(lines[0]) ? 1 : 0;

  const { dateColumn, descriptionColumn, amountColumn, categoryColumn } = columnMapping;
  const minColumns = Math.max(dateColumn, descriptionColumn, amountColumn, categoryColumn ?? 0) + 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const rowNumber = i + 1;
    const fields = parseCsvLine(line, delimiter);

    if (fields.length < minColumns) {
      errors.push({
        rowNumber,
        field: 'row',
        message: `Row must have at least ${minColumns} columns`,
        rawValue: line,
      });
      continue;
    }

    // Extract fields based on column mapping
    const dateStr = fields[dateColumn];
    const description = fields[descriptionColumn];
    const amountStr = fields[amountColumn];
    const categoryName = categoryColumn !== null ? fields[categoryColumn] : '';

    // Skip empty/metadata rows (common at end of bank exports)
    const trimmedDate = dateStr.trim().replace(/^["']+|["']+$/g, ''); // Remove quotes
    if (!trimmedDate || trimmedDate === '') {
      continue;
    }

    // Validate date
    const date = parseDate(trimmedDate);
    if (!date) {
      errors.push({
        rowNumber,
        field: 'date',
        message: 'Invalid date format. Expected yyyy-MM-dd or dd/MM/yyyy',
        rawValue: dateStr,
      });
      continue;
    }

    // Validate description
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      errors.push({
        rowNumber,
        field: 'description',
        message: 'Description is required',
        rawValue: description,
      });
      continue;
    }

    if (trimmedDescription.length > 100) {
      errors.push({
        rowNumber,
        field: 'description',
        message: 'Description must be less than 100 characters',
        rawValue: description,
      });
      continue;
    }

    // Validate amount
    // If CSV has negative amounts, treat positive as income (bank statement convention)
    const { amount, isIncome } = parseAmount(amountStr.trim(), hasNegativeAmounts);

    // Skip income transactions if enabled (for bank statements)
    if (skipIncomeTransactions && isIncome) {
      skippedIncomeCount++;
      continue;
    }

    if (amount === null || amount <= 0) {
      errors.push({
        rowNumber,
        field: 'amount',
        message: 'Invalid amount. Must be a positive number',
        rawValue: amountStr,
      });
      continue;
    }

    if (amount > 1000000) {
      errors.push({
        rowNumber,
        field: 'amount',
        message: 'Amount must be less than 1,000,000',
        rawValue: amountStr,
      });
      continue;
    }

    // Check category (allow empty/Uncategorized)
    const trimmedCategory = categoryName.trim();
    const isUncategorized =
      !trimmedCategory ||
      trimmedCategory.toLowerCase() === 'uncategorized';

    if (!isUncategorized && !categoryMap.has(trimmedCategory.toLowerCase())) {
      unmatchedCategoriesSet.add(trimmedCategory);
    }

    validRows.push({
      date,
      description: trimmedDescription,
      categoryName: isUncategorized ? '' : trimmedCategory,
      amount,
      rowNumber,
    });
  }

  return {
    validRows,
    errors,
    unmatchedCategories: Array.from(unmatchedCategoriesSet),
    skippedIncomeCount,
  };
}

/**
 * Maps parsed rows to expense data ready for insertion
 */
export function mapRowsToExpenses(
  rows: ParsedExpenseRow[],
  categories: Category[],
  categoryMappings: Map<string, string | null>, // Maps category name to category_id or null
): Array<{ date: string; description: string; amount: number; category_id: string | null }> {
  const categoryMap = new Map(
    categories.map((cat) => [cat.name.toLowerCase(), cat.id]),
  );

  return rows.map((row) => {
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
}

/**
 * Checks if a line looks like a header row
 */
function isHeaderRow(line: string): boolean {
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
}

/**
 * Parses a CSV line, handling quoted fields
 */
function parseCsvLine(line: string, delimiter: string = ','): string[] {
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
}

/**
 * Parses a date string in various formats
 */
function parseDate(dateStr: string): string | null {
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
}

/**
 * Validates a date
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 2000 || year > 2100) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export interface AmountParseResult {
  amount: number | null;
  isIncome: boolean;
}

/**
 * Parses an amount string, handling various formats
 * Returns both the amount and whether it's income
 *
 * @param amountStr - The amount string to parse
 * @param treatPositiveAsIncome - If true, positive amounts (no sign) are income.
 *   This should be true for bank statements that use -/+ convention.
 *   If false, only explicit + prefix is treated as income.
 */
function parseAmount(amountStr: string, treatPositiveAsIncome: boolean): AmountParseResult {
  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[€$£¥\s]/g, '');

  // Check for +/- prefix
  const hasMinusSign = cleaned.startsWith('-');
  const hasPlusSign = cleaned.startsWith('+');

  // Remove +/- prefix for parsing
  if (hasMinusSign || hasPlusSign) {
    cleaned = cleaned.substring(1);
  }

  // Handle European format (1.234,56) - thousands with dots, decimals with comma
  if (/^\d{1,3}(?:\.\d{3})*,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Handle format with just comma as decimal (123,45 or 123,5)
  else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  }
  // Handle US format (1,234.56) - thousands with commas, decimals with dots
  else if (/^\d{1,3}(?:,\d{3})*\.\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  }

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    return { amount: null, isIncome: false };
  }

  // Determine if this is income:
  // - If treatPositiveAsIncome is true (bank statement with negatives):
  //   positive (no sign or +) = income, negative = expense
  // - If treatPositiveAsIncome is false (e.g., Budgard export):
  //   only explicit + is income, everything else is expense
  const isIncome = treatPositiveAsIncome ? !hasMinusSign : hasPlusSign;

  return {
    amount: Math.round(amount * 100) / 100,
    isIncome
  };
}

/**
 * Reads a file and returns its content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
