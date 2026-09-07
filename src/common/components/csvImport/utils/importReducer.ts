import type {
  ColumnMapping,
  CsvParseError,
  CsvPreviewData,
  ParsedExpenseRow,
} from '@/common/components/csvImport/utils/csvTypes';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

export type ImportState = {
  step: ImportStep;
  csvContent: string;
  csvPreview: CsvPreviewData | null;
  columnMapping: ColumnMapping;
  shouldSkipIncome: boolean;
  validRows: ParsedExpenseRow[];
  errors: CsvParseError[];
  unmatchedCategories: string[];
  skippedIncomeCount: number;
  categoryMappings: Map<string, string | null>;
  importError: string | null;
};

const INITIAL_COLUMN_MAPPING: ColumnMapping = {
  dateColumn: 0,
  descriptionColumn: 1,
  amountColumn: 3,
  categoryColumn: null,
};

export const INITIAL_IMPORT_STATE: ImportState = {
  step: 'upload',
  csvContent: '',
  csvPreview: null,
  columnMapping: INITIAL_COLUMN_MAPPING,
  shouldSkipIncome: true,
  validRows: [],
  errors: [],
  unmatchedCategories: [],
  skippedIncomeCount: 0,
  categoryMappings: new Map(),
  importError: null,
};

export type ImportAction =
  | { type: 'reset' }
  | {
      type: 'csvLoaded';
      content: string;
      preview: CsvPreviewData;
      mapping: ColumnMapping;
    }
  | {
      type: 'statementLoaded';
      content: string;
      rows: ParsedExpenseRow[];
      unmatched: string[];
    }
  | {
      type: 'parsed';
      validRows: ParsedExpenseRow[];
      errors: CsvParseError[];
      unmatchedCategories: string[];
      skippedIncomeCount: number;
    }
  | { type: 'categoryMapped'; name: string; categoryId: string | null }
  | { type: 'importStarted' }
  | { type: 'importFailed'; message: string }
  | { type: 'backToMapping' }
  | {
      type: 'columnChanged';
      field: keyof ColumnMapping;
      value: number | null;
    }
  | { type: 'skipIncomeChanged'; value: boolean };

/**
 * One reducer rather than eleven useState calls, for the same reason
 * useDataLayer keeps one: almost every step of the import moves five or six of
 * these fields at once, and a step that forgets one of them is exactly how a
 * half-reset dialog reopens holding the previous file's rows.
 */
export const importReducer = (
  state: ImportState,
  action: ImportAction,
): ImportState => {
  switch (action.type) {
    case 'reset':
      return INITIAL_IMPORT_STATE;

    case 'csvLoaded':
      return {
        ...state,
        step: 'mapping',
        csvContent: action.content,
        csvPreview: action.preview,
        columnMapping: action.mapping,
      };

    // A statement describes its own fields, so it lands on preview with no
    // mapping step in between.
    case 'statementLoaded':
      return {
        ...state,
        step: 'preview',
        csvContent: action.content,
        validRows: action.rows,
        errors: [],
        unmatchedCategories: action.unmatched,
        skippedIncomeCount: 0,
        categoryMappings: unmappedFor(action.unmatched),
      };

    case 'parsed':
      return {
        ...state,
        step: 'preview',
        validRows: action.validRows,
        errors: action.errors,
        unmatchedCategories: action.unmatchedCategories,
        skippedIncomeCount: action.skippedIncomeCount,
        categoryMappings: unmappedFor(action.unmatchedCategories),
      };

    case 'categoryMapped': {
      const categoryMappings = new Map(state.categoryMappings);
      categoryMappings.set(action.name, action.categoryId);

      return { ...state, categoryMappings };
    }

    case 'importStarted':
      return { ...state, step: 'importing' };

    case 'importFailed':
      return { ...state, step: 'preview', importError: action.message };

    case 'backToMapping':
      return { ...state, step: 'mapping', importError: null };

    case 'columnChanged':
      return {
        ...state,
        columnMapping: {
          ...state.columnMapping,
          [action.field]: action.value,
        },
      };

    case 'skipIncomeChanged':
      return { ...state, shouldSkipIncome: action.value };
  }
};

// null is the sentinel for "skip this category". Every unmatched name starts
// there, so an import the user never maps drops those rows rather than
// inventing a category for them.
const unmappedFor = (names: string[]): Map<string, string | null> => {
  return new Map(names.map((name) => [name, null]));
};
