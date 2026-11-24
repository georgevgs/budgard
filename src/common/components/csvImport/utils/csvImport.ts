import type { Category } from '@/types/Category';
import {
  BUDGARD_CSV_TYPE_COLUMN,
  getBudgardCsvFormatOrNull,
  getBudgardCsvTypeOrNull,
  isBudgardCsvUncategorized,
  type BudgardCsvFormat,
  type BudgardCsvType,
} from '@/common/components/csvImport/utils/budgardCsv';
import {
  detectDelimiter,
  isHeaderRow,
  parseCsvLine,
} from '@/common/components/csvImport/utils/csvText';
import type {
  ColumnMapping,
  CsvParseError,
  CsvParseResult,
  ParsedExpenseRow,
} from '@/common/components/csvImport/utils/csvTypes';
import {
  parseAmount,
  parseDate,
  validateDescription,
} from '@/common/components/csvImport/utils/csvValues';

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
  const result: CsvParseResult = {
    validRows: [],
    errors: [],
    unmatchedCategories: [],
    skippedIncomeCount: 0,
  };
  const unmatchedCategories = new Set<string>();
  const categoryNames = new Set(
    categories.map((category) => category.name.toLowerCase()),
  );
  const delimiter = detectDelimiter(lines[0]);
  const format = getBudgardCsvFormatOrNull(parseCsvLine(lines[0], delimiter));
  const hasHeader = null !== format || isHeaderRow(lines[0]);
  const firstDataIndex = Number(hasHeader);
  const { dateColumn, descriptionColumn, amountColumn, categoryColumn } =
    columnMapping;
  const minColumns =
    Math.max(dateColumn, descriptionColumn, amountColumn, categoryColumn ?? 0) +
    1;

  for (const [index, rawLine] of lines.slice(firstDataIndex).entries()) {
    const line = rawLine.trim();
    if ('' !== line) {
      const outcome = processRow({
        fields: parseCsvLine(line, delimiter),
        line,
        rowNumber: index + firstDataIndex + 1,
        columnMapping,
        minColumns,
        categoryNames,
        hasSignedConvention,
        shouldSkipIncomeTransactions,
        format,
      });

      if ('income' === outcome.kind) {
        result.skippedIncomeCount++;
      } else if ('error' === outcome.kind) {
        result.errors.push(outcome.error);
      } else if ('valid' === outcome.kind) {
        result.validRows.push(outcome.row);
        if (null !== outcome.unmatchedCategory) {
          unmatchedCategories.add(outcome.unmatchedCategory);
        }
      }
    }
  }

  return { ...result, unmatchedCategories: [...unmatchedCategories] };
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

type RowOptions = {
  fields: string[];
  line: string;
  rowNumber: number;
  columnMapping: ColumnMapping;
  minColumns: number;
  categoryNames: ReadonlySet<string>;
  hasSignedConvention: boolean;
  shouldSkipIncomeTransactions: boolean;
  format: BudgardCsvFormat | null;
};

const processRow = (options: RowOptions): RowOutcome => {
  const { fields, line, rowNumber, minColumns, columnMapping } = options;
  const { dateColumn, descriptionColumn } = columnMapping;
  const rawDate = fields[dateColumn] ?? '';
  const trimmedDate = rawDate.trim().replace(/^["']+|["']+$/g, '');

  if (minColumns > fields.length) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'row',
        messageKey: 'import.rowErrors.tooFewColumns',
        messageParams: { count: minColumns },
        rawValue: line,
      },
    };
  } else if ('' === trimmedDate) {
    return { kind: 'empty' };
  } else {
    const date = parseDate(trimmedDate);
    const description = fields[descriptionColumn];

    if (null !== date) {
      const descriptionError = validateDescription(description, rowNumber);
      if (null !== descriptionError) {
        return { kind: 'error', error: descriptionError };
      } else {
        return processTransaction(options, date, description.trim());
      }
    } else {
      return {
        kind: 'error',
        error: {
          rowNumber,
          field: 'date',
          messageKey: 'import.rowErrors.invalidDate',
          rawValue: rawDate,
        },
      };
    }
  }
};

const MAX_AMOUNT = 1_000_000;

const processTransaction = (
  options: RowOptions,
  date: string,
  description: string,
): RowOutcome => {
  const {
    fields,
    rowNumber,
    columnMapping,
    categoryNames,
    hasSignedConvention,
    shouldSkipIncomeTransactions,
    format,
  } = options;
  const rawAmount = fields[columnMapping.amountColumn];
  const rawType = fields[BUDGARD_CSV_TYPE_COLUMN] ?? '';
  const transactionType = getBudgardCsvTypeOrNull(rawType, format);

  if (null !== format && null === transactionType) {
    return {
      kind: 'error',
      error: {
        rowNumber,
        field: 'type',
        messageKey: 'import.rowErrors.invalidType',
        rawValue: rawType,
      },
    };
  } else {
    const { amount, isIncome } = parseTransactionAmount(
      rawAmount.trim(),
      hasSignedConvention,
      transactionType,
    );
    if (shouldSkipIncomeTransactions && isIncome) {
      return { kind: 'income' };
    } else if (null === amount || 0 === amount) {
      return {
        kind: 'error',
        error: {
          rowNumber,
          field: 'amount',
          messageKey: 'import.rowErrors.invalidAmount',
          rawValue: rawAmount,
        },
      };
    } else if (MAX_AMOUNT < amount) {
      return {
        kind: 'error',
        error: {
          rowNumber,
          field: 'amount',
          messageKey: 'import.rowErrors.amountTooLarge',
          rawValue: rawAmount,
        },
      };
    } else {
      const categoryName = getCategoryName(
        fields,
        columnMapping.categoryColumn,
        format,
      );
      const row = {
        date,
        description,
        categoryName,
        amount,
        rowNumber,
        isIncome,
      };

      return {
        kind: 'valid',
        row,
        unmatchedCategory: getUnmatchedCategoryOrNull(
          categoryName,
          categoryNames,
        ),
      };
    }
  }
};

const getCategoryName = (
  fields: string[],
  categoryColumn: number | null,
  format: BudgardCsvFormat | null,
): string => {
  if (null === categoryColumn) {
    return '';
  }

  const name = fields[categoryColumn].trim();
  if (
    'uncategorized' === name.toLowerCase() ||
    isBudgardCsvUncategorized(name, format)
  ) {
    return '';
  } else {
    return name;
  }
};

const getUnmatchedCategoryOrNull = (
  name: string,
  categoryNames: ReadonlySet<string>,
): string | null => {
  if ('' !== name && false === categoryNames.has(name.toLowerCase())) {
    return name;
  } else {
    return null;
  }
};

const parseTransactionAmount = (
  value: string,
  hasSignedConvention: boolean,
  transactionType: BudgardCsvType | null,
) => {
  if (null === transactionType) {
    return parseAmount(value, hasSignedConvention);
  }

  const { amount } = parseAmount(value, false);
  if ('expense' === transactionType && null !== amount) {
    return { amount: -amount, isIncome: false };
  } else {
    return { amount, isIncome: 'income' === transactionType };
  }
};
