import { useTranslation } from 'react-i18next';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import X from 'lucide-react/dist/esm/icons/x';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/common/ui/dialog';
import { Button } from '@/common/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/ui/select';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useCsvImportFlow } from '@/pages/expenses/hooks/useCsvImportFlow';
import CsvMappingStep from '@/pages/expenses/components/CsvMappingStep';
import type { Category } from '@/types/Category';
import { cn, formatCurrency } from '@/constants/utils';
import type {
  CsvParseError,
  ParsedExpenseRow,
} from '@/pages/expenses/utils/csvTypes';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const CsvImportDialog = ({ open, onClose }: CsvImportDialogProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const flow = useCsvImportFlow(onClose);

  return (
    <Dialog open={open} onOpenChange={flow.handleClose}>
      <DialogContent
        className="sm:max-w-[550px] p-0 gap-0"
        aria-describedby={undefined}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4"
          style={{ touchAction: 'pan-y' }}
        >
          <DialogHeader className="pb-4 pr-10 pt-2 sm:pt-0">
            <DialogTitle className="text-xl">{t('import.title')}</DialogTitle>
          </DialogHeader>

          {renderUploadStep(
            flow.step === 'upload',
            flow.isDragging,
            flow.handleDrop,
            flow.handleFileInput,
            flow.setIsDragging,
            t,
          )}
          {renderMappingStep(flow, t)}
          {renderPreviewStep(
            flow.step === 'preview',
            flow.validRows,
            flow.errors,
            flow.skippedIncomeCount,
            flow.unmatchedCategories,
            flow.categories,
            flow.categoryMappings,
            flow.handleCategoryMapping,
            flow.handleImport,
            flow.handleBackToMapping,
            flow.importError,
            t,
            defaultCurrency,
          )}
          {renderImportingStep(
            flow.step === 'importing',
            flow.validRows.length,
            t,
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;

// --- Helpers ---

type CsvFlow = ReturnType<typeof useCsvImportFlow>;

const renderMappingStep = (flow: CsvFlow, t: TranslateFunction) => {
  if (flow.step !== 'mapping') {
    return null;
  }
  if (!flow.csvPreview) {
    return null;
  }

  return (
    <CsvMappingStep
      csvPreview={flow.csvPreview}
      columnMapping={flow.columnMapping}
      skipIncome={flow.skipIncome}
      updateColumnMapping={flow.updateColumnMapping}
      setSkipIncome={flow.setSkipIncome}
      onBack={flow.resetState}
      onContinue={flow.handleProceedToPreview}
      t={t}
    />
  );
};

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const parseCategoryMapValue = (value: string): string | null => {
  if (value === '_skip') {
    return null;
  }

  return value;
};

const renderUploadStep = (
  isCurrentStep: boolean,
  isDragging: boolean,
  onDrop: (e: React.DragEvent) => void,
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void,
  setIsDragging: (v: boolean) => void,
  t: TranslateFunction,
) => {
  if (!isCurrentStep) return null;

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors mb-4',
        isDragging && 'border-primary-ink bg-primary/5',
        !isDragging && 'border-muted-foreground/25',
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground mb-2">
        {t('import.dropzone')}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        {t('import.formatHint')}
      </p>
      <label>
        <input
          type="file"
          accept=".csv,.ofx,.qfx,.qif"
          onChange={onFileInput}
          className="hidden"
        />
        <Button variant="outline" asChild>
          <span>{t('import.selectFile')}</span>
        </Button>
      </label>
    </div>
  );
};

const renderSkippedCount = (count: number, t: TranslateFunction) => {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{t('import.skippedIncome', { count })}</span>
    </div>
  );
};

const renderIncomeCount = (rows: ParsedExpenseRow[], t: TranslateFunction) => {
  const count = rows.filter((row) => row.isIncome).length;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-income-ink">
      <span>{t('import.incomeRows', { count })}</span>
    </div>
  );
};

const renderErrorCount = (count: number, t: TranslateFunction) => {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <AlertCircle className="h-4 w-4 text-destructive-ink" />
      <span>{t('import.errorRows', { count })}</span>
    </div>
  );
};

const renderUnmatchedCategories = (
  unmatchedCategories: string[],
  categories: Category[],
  categoryMappings: Map<string, string | null>,
  onCategoryMap: (name: string, id: string | null) => void,
  t: TranslateFunction,
) => {
  if (unmatchedCategories.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('import.unmatchedCategories')}</p>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {unmatchedCategories.map((catName) => (
          <div key={catName} className="flex items-center gap-2">
            <span className="text-sm flex-1 truncate">{catName}</span>
            <Select
              value={categoryMappings.get(catName) || '_skip'}
              onValueChange={(value) =>
                onCategoryMap(catName, parseCategoryMapValue(value))
              }
            >
              <SelectTrigger
                className="w-40"
                aria-label={t('import.mapCategoryTo', { name: catName })}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_skip">
                  {t('import.skipCategory')}
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderMoreRowsNote = (total: number, t: TranslateFunction) => {
  if (total <= 50) return null;

  return (
    <p className="text-xs text-muted-foreground text-center py-2">
      {t('import.showingFirst', { shown: 50, total })}
    </p>
  );
};

const renderValidRowsTable = (
  validRows: ParsedExpenseRow[],
  t: TranslateFunction,
  currency: string,
) => {
  if (validRows.length === 0) return null;

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium mb-2">{t('import.preview')}</p>
      <div className="overflow-auto border rounded-md max-h-64">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="px-2 py-1 text-left font-medium">
                {t('expenses.date')}
              </th>
              <th className="px-2 py-1 text-left font-medium">
                {t('expenses.description')}
              </th>
              <th className="px-2 py-1 text-left font-medium">
                {t('expenses.category')}
              </th>
              <th className="px-2 py-1 text-right font-medium">
                {t('expenses.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {validRows.slice(0, 50).map((row, idx) => (
              <tr
                key={`${row.date}-${row.description}-${idx}`}
                className="border-t"
              >
                <td className="px-2 py-1">{row.date}</td>
                <td className="px-2 py-1 truncate max-w-[150px]">
                  {row.description}
                </td>
                <td className="px-2 py-1 truncate max-w-[100px]">
                  {row.categoryName || '-'}
                </td>
                <td className="px-2 py-1 text-right">
                  {formatCurrency(row.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {renderMoreRowsNote(validRows.length, t)}
      </div>
    </div>
  );
};

const renderMoreErrorsNote = (total: number, t: TranslateFunction) => {
  if (total <= 10) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {t('import.moreErrors', { count: total - 10 })}
    </p>
  );
};

const renderErrorsList = (errors: CsvParseError[], t: TranslateFunction) => {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-destructive-ink">
        {t('import.errors')}
      </p>
      <div className="max-h-24 overflow-y-auto space-y-1">
        {errors.slice(0, 10).map((error) => (
          <div
            key={error.rowNumber}
            className="flex items-start gap-2 text-xs text-destructive-ink"
          >
            <X className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              {t('import.errorRow', { row: error.rowNumber })}:{' '}
              {t(error.messageKey, error.messageParams)}
            </span>
          </div>
        ))}
        {renderMoreErrorsNote(errors.length, t)}
      </div>
    </div>
  );
};

const renderImportErrorBanner = (error: string | null) => {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
      <AlertCircle className="h-4 w-4 text-destructive-ink shrink-0" />
      <p className="text-sm text-destructive-ink">{error}</p>
    </div>
  );
};

const renderPreviewStep = (
  isCurrentStep: boolean,
  validRows: ParsedExpenseRow[],
  errors: CsvParseError[],
  skippedIncomeCount: number,
  unmatchedCategories: string[],
  categories: Category[],
  categoryMappings: Map<string, string | null>,
  onCategoryMap: (name: string, id: string | null) => void,
  onImport: () => void,
  onBack: () => void,
  importError: string | null,
  t: TranslateFunction,
  currency: string,
) => {
  if (!isCurrentStep) return null;

  return (
    <div className="flex flex-col space-y-4 pb-4">
      {renderImportErrorBanner(importError)}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-income-ink" />
          <span>{t('import.validRows', { count: validRows.length })}</span>
        </div>
        {renderSkippedCount(skippedIncomeCount, t)}
        {renderIncomeCount(validRows, t)}
        {renderErrorCount(errors.length, t)}
      </div>
      {renderUnmatchedCategories(
        unmatchedCategories,
        categories,
        categoryMappings,
        onCategoryMap,
        t,
      )}
      {renderValidRowsTable(validRows, t, currency)}
      {renderErrorsList(errors, t)}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onBack}>
          {t('import.back')}
        </Button>
        <Button onClick={onImport} disabled={validRows.length === 0}>
          {t('import.importButton', { count: validRows.length })}
        </Button>
      </div>
    </div>
  );
};

const renderImportingStep = (
  isCurrentStep: boolean,
  rowCount: number,
  t: TranslateFunction,
) => {
  if (!isCurrentStep) return null;

  return (
    <div className="py-8 text-center pb-4">
      <Loader2 className="h-10 w-10 mx-auto mb-4 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">
        {t('import.importing', { count: rowCount })}
      </p>
    </div>
  );
};
