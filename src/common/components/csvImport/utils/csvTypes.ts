
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

export type CsvParseResult = {
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
