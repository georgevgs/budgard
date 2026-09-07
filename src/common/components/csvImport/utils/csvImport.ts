import type { Category } from '@/types/Category';
import { detectDelimiter, isHeaderRow, parseCsvLine } from '@/common/components/csvImport/utils/csvText';
import type { ColumnMapping, CsvParseError, CsvParseResult, ParsedExpenseRow } from '@/common/components/csvImport/utils/csvTypes';
import { parseAmount, parseDate, validateDescription } from '@/common/components/csvImport/utils/csvValues';

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
  shouldSkipIncomeTransactions: boolean = true,
  hasSignedConvention: boolean = false,
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
    if (!line) {
      continue;
    }

    const rowNumber = i + 1;
    const fields = parseCsvLine(line, delimiter);
    const outcome = processRow(
      fields,
      line,
      rowNumber,
      columnMapping,
      minColumns,
      categoryMap,
      hasSignedConvention,
      shouldSkipIncomeTransactions,
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
  hasSignedConvention: boolean,
  shouldSkipIncomeTransactions: boolean,
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
  if (!trimmedDate) {
    return { kind: 'empty' };
  }

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
  if (descriptionError) {
    return { kind: 'error', error: descriptionError };
  }
  const trimmedDescription = description.trim();

  const { amount, isIncome } = parseAmount(amountStr.trim(), hasSignedConvention);

  if (shouldSkipIncomeTransactions && isIncome) {
    return { kind: 'income' };
  }

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
