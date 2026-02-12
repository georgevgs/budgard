import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, AlertCircle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/useToast';
import { dataService } from '@/services/dataService';
import { formatCurrency } from '@/lib/utils';
import {
  parseExpensesCsv,
  mapRowsToExpenses,
  readFileAsText,
  getCsvPreviewData,
  suggestColumnMapping,
  type ParsedExpenseRow,
  type CsvParseError,
  type CsvPreviewData,
  type ColumnMapping,
} from '@/lib/csvImport';

interface CsvImportDialogProps {
  open: boolean;
  onClose: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing';

const CsvImportDialog = ({ open, onClose }: CsvImportDialogProps) => {
  const { t } = useTranslation();
  const { categories, refreshExpenses } = useData();
  const { toast } = useToast();

  // Step state
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);

  // CSV content state
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    dateColumn: 0,
    descriptionColumn: 1,
    amountColumn: 3,
    categoryColumn: null,
  });
  const [skipIncome, setSkipIncome] = useState(true);

  // Parse results state
  const [validRows, setValidRows] = useState<ParsedExpenseRow[]>([]);
  const [errors, setErrors] = useState<CsvParseError[]>([]);
  const [unmatchedCategories, setUnmatchedCategories] = useState<string[]>([]);
  const [skippedIncomeCount, setSkippedIncomeCount] = useState(0);
  const [categoryMappings, setCategoryMappings] = useState<Map<string, string | null>>(new Map());

  const resetState = useCallback(() => {
    setStep('upload');
    setCsvContent('');
    setCsvPreview(null);
    setColumnMapping({
      dateColumn: 0,
      descriptionColumn: 1,
      amountColumn: 3,
      categoryColumn: null,
    });
    setSkipIncome(true);
    setValidRows([]);
    setErrors([]);
    setUnmatchedCategories([]);
    setCategoryMappings(new Map());
    setSkippedIncomeCount(0);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.csv')) {
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
    [toast, t],
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
    const hasNegativeAmounts = csvPreview?.hasNegativeAmounts ?? false;
    const result = parseExpensesCsv(csvContent, categories, columnMapping, skipIncome, hasNegativeAmounts);

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
  }, [csvContent, categories, columnMapping, skipIncome]);

  const handleCategoryMapping = useCallback((categoryName: string, categoryId: string | null) => {
    setCategoryMappings((prev) => {
      const next = new Map(prev);
      next.set(categoryName, categoryId);
      return next;
    });
  }, []);

  const handleImport = useCallback(async () => {
    setStep('importing');

    try {
      const expensesToImport = mapRowsToExpenses(validRows, categories, categoryMappings);
      await dataService.createExpensesBulk(expensesToImport);
      await refreshExpenses();

      toast({
        title: t('common.success'),
        description: t('import.successMessage', { count: expensesToImport.length }),
      });

      handleClose();
    } catch {
      toast({
        title: t('common.error'),
        description: t('import.importError'),
        variant: 'destructive',
      });
      setStep('preview');
    }
  }, [validRows, categories, categoryMappings, refreshExpenses, toast, t, handleClose]);

  const updateColumnMapping = useCallback((field: keyof ColumnMapping, value: number | null) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[550px] p-0 gap-0"
        aria-describedby={undefined}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden">
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain" style={{ touchAction: 'pan-y' }}>
          <DialogHeader className="pb-4 pt-2 sm:pt-0">
            <DialogTitle className="text-xl">{t('import.title')}</DialogTitle>
          </DialogHeader>

          {/* Step 1: Upload */}
          {step === 'upload' && (
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors mb-4
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
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
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>{t('import.selectFile')}</span>
              </Button>
            </label>
          </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && csvPreview && (
          <div className="flex flex-col space-y-4 pb-4">
            <p className="text-sm text-muted-foreground">
              {t('import.mappingDescription')}
            </p>

            {/* Column Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('import.dateColumn')}</Label>
                <Select
                  value={columnMapping.dateColumn.toString()}
                  onValueChange={(v) => updateColumnMapping('dateColumn', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map((header, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {header || `Column ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('import.descriptionColumn')}</Label>
                <Select
                  value={columnMapping.descriptionColumn.toString()}
                  onValueChange={(v) => updateColumnMapping('descriptionColumn', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map((header, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {header || `Column ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('import.amountColumn')}</Label>
                <Select
                  value={columnMapping.amountColumn.toString()}
                  onValueChange={(v) => updateColumnMapping('amountColumn', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {csvPreview.headers.map((header, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {header || `Column ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t('import.categoryColumn')}</Label>
                <Select
                  value={columnMapping.categoryColumn?.toString() ?? '_none'}
                  onValueChange={(v) =>
                    updateColumnMapping('categoryColumn', v === '_none' ? null : parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('import.noCategory')}</SelectItem>
                    {csvPreview.headers.map((header, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>
                        {header || `Column ${idx + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skip Income Toggle */}
            <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
              <div className="space-y-0.5">
                <Label className="text-sm">{t('import.skipIncome')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('import.skipIncomeDescription')}
                </p>
              </div>
              <Switch checked={skipIncome} onCheckedChange={setSkipIncome} />
            </div>

            {/* Sample Data Preview */}
            <div className="flex flex-col">
              <p className="text-sm font-medium mb-2">
                {t('import.sampleData', { count: csvPreview.totalRows })}
              </p>
              <div className="overflow-auto border rounded-md text-xs max-h-48">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {csvPreview.headers.map((header, idx) => (
                        <th key={idx} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                          {header || `Col ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.sampleRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t">
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={`px-2 py-1 truncate max-w-[120px] ${
                              cellIdx === columnMapping.dateColumn ||
                              cellIdx === columnMapping.descriptionColumn ||
                              cellIdx === columnMapping.amountColumn ||
                              cellIdx === columnMapping.categoryColumn
                                ? 'bg-primary/10'
                                : ''
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={resetState}>
                {t('import.back')}
              </Button>
              <Button onClick={handleProceedToPreview}>
                {t('import.continue')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
          <div className="flex flex-col space-y-4 pb-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{t('import.validRows', { count: validRows.length })}</span>
              </div>
              {skippedIncomeCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t('import.skippedIncome', { count: skippedIncomeCount })}</span>
                </div>
              )}
              {errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{t('import.errorRows', { count: errors.length })}</span>
                </div>
              )}
            </div>

            {/* Unmatched Categories */}
            {unmatchedCategories.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('import.unmatchedCategories')}</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {unmatchedCategories.map((catName) => (
                    <div key={catName} className="flex items-center gap-2">
                      <span className="text-sm flex-1 truncate">{catName}</span>
                      <Select
                        value={categoryMappings.get(catName) || '_skip'}
                        onValueChange={(value) =>
                          handleCategoryMapping(catName, value === '_skip' ? null : value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_skip">{t('import.skipCategory')}</SelectItem>
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
            )}

            {/* Preview Table */}
            {validRows.length > 0 && (
              <div className="flex flex-col">
                <p className="text-sm font-medium mb-2">{t('import.preview')}</p>
                <div className="overflow-auto border rounded-md max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium">{t('expenses.date')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('expenses.description')}</th>
                        <th className="px-2 py-1 text-left font-medium">{t('expenses.category')}</th>
                        <th className="px-2 py-1 text-right font-medium">{t('expenses.amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="px-2 py-1">{row.date}</td>
                          <td className="px-2 py-1 truncate max-w-[150px]">{row.description}</td>
                          <td className="px-2 py-1 truncate max-w-[100px]">
                            {row.categoryName || '-'}
                          </td>
                          <td className="px-2 py-1 text-right">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      {t('import.showingFirst', { shown: 50, total: validRows.length })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">{t('import.errors')}</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {errors.slice(0, 10).map((error, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-destructive">
                      <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        {t('import.errorRow', { row: error.rowNumber })}: {error.message}
                      </span>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      {t('import.moreErrors', { count: errors.length - 10 })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                {t('import.back')}
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                {t('import.importButton', { count: validRows.length })}
              </Button>
            </div>
          </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
          <div className="py-8 text-center pb-4">
            <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {t('import.importing', { count: validRows.length })}
            </p>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
