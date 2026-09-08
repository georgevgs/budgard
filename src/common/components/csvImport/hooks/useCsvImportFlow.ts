import { useState, useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesData } from '@/common/contexts/DataContext';
import { useToast } from '@/common/hooks/useToast';
import { useExpenseOps } from '@/common/hooks/dataOps/useExpenseOps';
import { useIncomeOps } from '@/common/hooks/dataOps/useIncomeOps';
import {
  suggestColumnMapping,
  usesSignedAmountConvention,
} from '@/common/components/csvImport/utils/csvColumns';
import {
  mapRowsToExpenses,
  mapRowsToIncomes,
  parseExpensesCsv,
} from '@/common/components/csvImport/utils/csvImport';
import {
  getCsvPreviewData,
  readFileAsText,
} from '@/common/components/csvImport/utils/csvText';
import type {
  ColumnMapping,
  ParsedExpenseRow,
} from '@/common/components/csvImport/utils/csvTypes';
import {
  detectStatementFormat,
  parseStatement,
} from '@/common/components/csvImport/utils/statementImport';
import {
  importReducer,
  INITIAL_IMPORT_STATE,
  type ImportAction,
  type ImportState,
} from '@/common/components/csvImport/utils/importReducer';
import type { Category } from '@/types/Category';

export const useCsvImportFlow = (onClose: () => void) => {
  const { t } = useTranslation();
  const { expenseCategories: categories } = useCategoriesData();
  const { toast } = useToast();
  const { handleBulkExpenseImport } = useExpenseOps();
  const { handleBulkIncomeImport } = useIncomeOps();

  const [state, dispatch] = useReducer(importReducer, INITIAL_IMPORT_STATE);
  // Not import state: a drag hovering the drop zone says nothing about the
  // file being imported, and it must survive a reset.
  const [isDragging, setIsDragging] = useState(false);

  const resetState = useCallback(() => dispatch({ type: 'reset' }), []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFile = useCallback(
    async (file: File) => {
      const outcome = await loadImportFile(file, categories);

      if (outcome.status === 'rejected') {
        toast({
          title: t('common.error'),
          description: t(outcome.messageKey),
          variant: 'destructive',
        });

        return;
      }

      dispatch(outcome.action);

      // Reported, not swallowed: importing 340 of 341 transactions without
      // saying so is worse than saying which one could not be read.
      if (outcome.skipped > 0) {
        toast({
          title: t('import.someRowsSkipped', { count: outcome.skipped }),
        });
      }
    },
    [toast, t, categories],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleProceedToPreview = useCallback(() => {
    dispatch({ type: 'parsed', ...parseWithMapping(state, categories) });
  }, [state, categories]);

  const handleCategoryMapping = useCallback(
    (categoryName: string, categoryId: string | null) => {
      dispatch({ type: 'categoryMapped', name: categoryName, categoryId });
    },
    [],
  );

  const handleImport = useCallback(async () => {
    dispatch({ type: 'importStarted' });

    try {
      const count = await writeImportedRows(state.validRows, {
        categories,
        categoryMappings: state.categoryMappings,
        importExpenses: handleBulkExpenseImport,
        importIncomes: handleBulkIncomeImport,
      });

      toast({
        title: t('common.success'),
        description: t('import.successMessage', { count }),
      });

      handleClose();
    } catch {
      dispatch({ type: 'importFailed', message: t('import.importError') });
    }
  }, [
    state.validRows,
    state.categoryMappings,
    categories,
    handleBulkExpenseImport,
    handleBulkIncomeImport,
    toast,
    t,
    handleClose,
  ]);

  const handleBackToMapping = useCallback(
    () => dispatch({ type: 'backToMapping' }),
    [],
  );

  const updateColumnMapping = useCallback(
    (field: keyof ColumnMapping, value: number | null) => {
      dispatch({ type: 'columnChanged', field, value });
    },
    [],
  );

  const setShouldSkipIncome = useCallback(
    (value: boolean) => dispatch({ type: 'skipIncomeChanged', value }),
    [],
  );

  return {
    ...state,
    categories,
    isDragging,
    setIsDragging,
    setShouldSkipIncome,
    resetState,
    handleClose,
    handleDrop,
    handleFileInput,
    handleProceedToPreview,
    handleCategoryMapping,
    handleImport,
    handleBackToMapping,
    updateColumnMapping,
  };
};

const IMPORTABLE_EXTENSIONS = ['.csv', '.ofx', '.qfx', '.qif'];

const isImportableFile = (name: string): boolean => {
  const lower = name.toLowerCase();

  return IMPORTABLE_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

// Statement rows carry whatever category the exporting app used, which is its
// taxonomy rather than the user's. A name that happens to match one of theirs
// is taken; everything else is offered for mapping, exactly as a CSV's would
// be — the user should not have to care which format the file was.
const matchStatementCategories = (
  rows: ParsedExpenseRow[],
  categories: Category[],
) => {
  const byName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category]),
  );
  const unmatched = new Set<string>();

  for (const row of rows) {
    if (!row.categoryName) {
      continue;
    }
    if (!byName.has(row.categoryName.toLowerCase())) {
      unmatched.add(row.categoryName);
    }
  }

  return { rows, unmatched: [...unmatched] };
};

/**
 * The sign convention is read from the column the user actually mapped as the
 * amount. Reading it from "any negative cell anywhere in the file" meant one
 * minus sign in a balance or a description flipped every unsigned row in the
 * import from expense to income.
 */
const parseWithMapping = (state: ImportState, categories: Category[]) => {
  let hasSignedConvention = false;
  if (state.csvPreview) {
    hasSignedConvention = usesSignedAmountConvention(
      state.csvPreview,
      state.columnMapping.amountColumn,
    );
  }

  return parseExpensesCsv(
    state.csvContent,
    categories,
    state.columnMapping,
    state.shouldSkipIncome,
    hasSignedConvention,
  );
};

type LoadOutcome =
  | { status: 'rejected'; messageKey: string }
  | { status: 'loaded'; action: ImportAction; skipped: number };

// Everything that can go wrong reading a file, answered with an i18n key
// rather than a thrown error, so the caller has one shape to render.
const loadImportFile = async (
  file: File,
  categories: Category[],
): Promise<LoadOutcome> => {
  if (!isImportableFile(file.name)) {
    return { status: 'rejected', messageKey: 'import.invalidFileType' };
  }

  try {
    const loaded = await readImportFile(file, categories);

    return { status: 'loaded', action: loaded.action, skipped: loaded.skipped };
  } catch {
    return { status: 'rejected', messageKey: 'import.parseError' };
  }
};

type LoadedFile = {
  action: ImportAction;
  // Rows the parser could not read at all, reported to the user afterwards.
  skipped: number;
};

/**
 * Reads a dropped file and says which step it lands on.
 *
 * OFX and QIF describe their own fields, so there is nothing for the user to
 * map — those files skip straight to the preview. Everything past that point
 * is the same pipeline as a CSV: the same category matching, the same review
 * handling, the same write. A second import path would be a second place for
 * those to drift.
 */
const readImportFile = async (
  file: File,
  categories: Category[],
): Promise<LoadedFile> => {
  const content = await readFileAsText(file);
  const statementFormat = detectStatementFormat(file.name, content);

  if (statementFormat) {
    const parsed = parseStatement(statementFormat, content);
    const matched = matchStatementCategories(parsed.rows, categories);

    return {
      action: {
        type: 'statementLoaded',
        content,
        rows: matched.rows,
        unmatched: matched.unmatched,
      },
      skipped: parsed.skipped,
    };
  }

  const preview = getCsvPreviewData(content);

  return {
    action: {
      type: 'csvLoaded',
      content,
      preview,
      mapping: suggestColumnMapping(preview),
    },
    skipped: 0,
  };
};

type ImportWriters = {
  categories: Category[];
  categoryMappings: Map<string, string | null>;
  importExpenses: (rows: ReturnType<typeof mapRowsToExpenses>) => Promise<void>;
  importIncomes: (rows: ReturnType<typeof mapRowsToIncomes>) => Promise<void>;
};

// Returns how many rows were actually written, which is what the success
// toast reports.
const writeImportedRows = async (
  validRows: ParsedExpenseRow[],
  writers: ImportWriters,
): Promise<number> => {
  const expenses = mapRowsToExpenses(
    validRows,
    writers.categories,
    writers.categoryMappings,
  );
  const incomes = mapRowsToIncomes(validRows);

  if (expenses.length > 0) {
    await writers.importExpenses(expenses);
  }
  if (incomes.length > 0) {
    await writers.importIncomes(incomes);
  }

  return expenses.length + incomes.length;
};
