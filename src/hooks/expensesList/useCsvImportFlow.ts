import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoriesData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/useToast';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import {
  parseExpensesCsv,
  mapRowsToExpenses,
  mapRowsToIncomes,
  readFileAsText,
  getCsvPreviewData,
  usesSignedAmountConvention,
  suggestColumnMapping,
  type ParsedExpenseRow,
  type CsvParseError,
  type CsvPreviewData,
  type ColumnMapping,
} from '@/lib/csvImport';
import {
  detectStatementFormat,
  parseStatement,
} from '@/lib/statementImport';
import type { Category } from '@/types/Category';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

const INITIAL_COLUMN_MAPPING: ColumnMapping = {
  dateColumn: 0,
  descriptionColumn: 1,
  amountColumn: 3,
  categoryColumn: null,
};

export const useCsvImportFlow = (onClose: () => void) => {
  const { t } = useTranslation();
  const { expenseCategories: categories } = useCategoriesData();
  const { toast } = useToast();
  const { handleBulkExpenseImport } = useExpenseOps();
  const { handleBulkIncomeImport } = useIncomeOps();

  // Step state
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);

  // CSV content state
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(
    INITIAL_COLUMN_MAPPING,
  );
  const [skipIncome, setSkipIncome] = useState(true);

  // Parse results state
  const [validRows, setValidRows] = useState<ParsedExpenseRow[]>([]);
  const [errors, setErrors] = useState<CsvParseError[]>([]);
  const [unmatchedCategories, setUnmatchedCategories] = useState<string[]>([]);
  const [skippedIncomeCount, setSkippedIncomeCount] = useState(0);
  const [categoryMappings, setCategoryMappings] = useState<
    Map<string, string | null>
  >(new Map());
  const [importError, setImportError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setCsvContent('');
    setCsvPreview(null);
    setColumnMapping(INITIAL_COLUMN_MAPPING);
    setSkipIncome(true);
    setValidRows([]);
    setErrors([]);
    setUnmatchedCategories([]);
    setCategoryMappings(new Map());
    setSkippedIncomeCount(0);
    setImportError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isImportableFile(file.name)) {
        toast({
          title: t('common.error'),
          description: t('import.invalidFileType'),
          variant: 'destructive',
        });

        return;
      }

      try {
        const content = await readFileAsText(file);
        setCsvContent(content);

        // OFX and QIF describe their own fields, so there is nothing for the
        // user to map — those files skip straight to the preview. Everything
        // past that point is the same pipeline as a CSV: the same category
        // matching, the same duplicate handling, the same write. A second
        // import path would be a second place for those to drift.
        const statementFormat = detectStatementFormat(file.name, content);
        if (statementFormat) {
          const parsed = parseStatement(statementFormat, content);
          const matched = matchStatementCategories(parsed.rows, categories);

          setValidRows(matched.rows);
          setErrors([]);
          setUnmatchedCategories(matched.unmatched);
          setSkippedIncomeCount(0);
          setCategoryMappings(
            new Map(matched.unmatched.map((name) => [name, null])),
          );
          setStep('preview');

          // Reported, not swallowed: importing 340 of 341 transactions without
          // saying so is worse than saying which one could not be read.
          if (parsed.skipped > 0) {
            toast({
              title: t('import.someRowsSkipped', { count: parsed.skipped }),
            });
          }

          return;
        }

        const preview = getCsvPreviewData(content);
        setCsvPreview(preview);

        // Auto-suggest column mapping
        const suggested = suggestColumnMapping(preview);
        setColumnMapping(suggested);

        setStep('mapping');
      } catch {
        toast({
          title: t('common.error'),
          description: t('import.parseError'),
          variant: 'destructive',
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
    // The sign convention is read from the column the user actually mapped as
    // the amount. Reading it from "any negative cell anywhere in the file"
    // meant one minus sign in a balance or a description flipped every
    // unsigned row in the import from expense to income.
    const signedConvention = csvPreview
      ? usesSignedAmountConvention(csvPreview, columnMapping.amountColumn)
      : false;
    const result = parseExpensesCsv(
      csvContent,
      categories,
      columnMapping,
      skipIncome,
      signedConvention,
    );

    setValidRows(result.validRows);
    setErrors(result.errors);
    setUnmatchedCategories(result.unmatchedCategories);
    setSkippedIncomeCount(result.skippedIncomeCount);

    // Initialize category mappings with null (skip)
    const initialMappings = new Map<string, string | null>();
    result.unmatchedCategories.forEach((cat) => {
      initialMappings.set(cat, null);
    });
    setCategoryMappings(initialMappings);

    setStep('preview');
  }, [csvContent, categories, columnMapping, skipIncome, csvPreview]);

  const handleCategoryMapping = useCallback(
    (categoryName: string, categoryId: string | null) => {
      setCategoryMappings((prev) => {
        const next = new Map(prev);
        next.set(categoryName, categoryId);

        return next;
      });
    },
    [],
  );

  const handleImport = useCallback(async () => {
    setStep('importing');

    try {
      const expensesToImport = mapRowsToExpenses(
        validRows,
        categories,
        categoryMappings,
      );
      const incomesToImport = mapRowsToIncomes(validRows);
      if (expensesToImport.length > 0) {
        await handleBulkExpenseImport(expensesToImport);
      }
      if (incomesToImport.length > 0) {
        await handleBulkIncomeImport(incomesToImport);
      }

      toast({
        title: t('common.success'),
        description: t('import.successMessage', {
          count: expensesToImport.length + incomesToImport.length,
        }),
      });

      handleClose();
    } catch {
      setImportError(t('import.importError'));
      setStep('preview');
    }
  }, [
    validRows,
    categories,
    categoryMappings,
    handleBulkExpenseImport,
    handleBulkIncomeImport,
    toast,
    t,
    handleClose,
  ]);

  const handleBackToMapping = useCallback(() => {
    setImportError(null);
    setStep('mapping');
  }, []);

  const updateColumnMapping = useCallback(
    (field: keyof ColumnMapping, value: number | null) => {
      setColumnMapping((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  return {
    categories,
    step,
    isDragging,
    setIsDragging,
    csvPreview,
    columnMapping,
    skipIncome,
    setSkipIncome,
    validRows,
    errors,
    unmatchedCategories,
    skippedIncomeCount,
    categoryMappings,
    importError,
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

// --- Helpers ---

const IMPORTABLE_EXTENSIONS = ['.csv', '.ofx', '.qfx', '.qif'];

export const isImportableFile = (fileName: string): boolean => {
  const name = fileName.toLowerCase();

  return IMPORTABLE_EXTENSIONS.some((extension) => name.endsWith(extension));
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
