import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, getYear } from 'date-fns';
import Download from 'lucide-react/dist/esm/icons/download';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { Button } from '@/components/ui/button';
import {
  useExpensesData,
  useIncomesData,
  useCategoriesData,
  useTagsData,
} from '@/contexts/DataContext';
import { useToast } from '@/hooks/useToast';
import { useAnnualPdfExport } from '@/hooks/analytics/useAnnualPdfExport';
import {
  buildCategorySummaryCsv,
  buildTransactionsCsv,
  downloadCsv,
} from '@/lib/csvExport';
import type { Expense } from '@/types/Expense';

type Props = {
  selectedYear: number;
};

const AnnualExportCard = ({ selectedYear }: Props) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { categories } = useCategoriesData();
  const tags = useTagsData();

  const yearTransactions = useMemo(() => {
    return collectYearTransactions(expenses, incomes, selectedYear);
  }, [expenses, incomes, selectedYear]);

  const pdfExport = useAnnualPdfExport(yearTransactions, selectedYear);

  if (yearTransactions.length === 0) {
    return null;
  }

  const handleExportTransactions = () => {
    const csv = buildTransactionsCsv(yearTransactions, categories, tags, t);
    downloadCsv(`budgard-${selectedYear}-transactions.csv`, csv);
    toast({
      title: t('annualExport.exportedTitle'),
      description: t('annualExport.exportedDescription', {
        count: yearTransactions.length,
        year: selectedYear,
      }),
    });
  };

  const handleExportSummary = () => {
    const csv = buildCategorySummaryCsv(yearTransactions, categories, t);
    downloadCsv(`budgard-${selectedYear}-summary.csv`, csv);
    toast({
      title: t('annualExport.exportedTitle'),
      description: t('annualExport.exportedSummaryDescription', {
        year: selectedYear,
      }),
    });
  };

  return (
    <div className="space-y-3">
      <h2 className="type-heading">
        {t('annualExport.title', { year: selectedYear })}
      </h2>

      <div className="surface-card">
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('annualExport.description', { year: selectedYear })}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {t('annualExport.transactionCount', {
                count: yearTransactions.length,
                year: selectedYear,
              })}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleExportTransactions}
              className="justify-start sm:justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('annualExport.exportTransactions')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportSummary}
              className="justify-start sm:justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('annualExport.exportSummary')}
            </Button>
            <Button
              variant="outline"
              onClick={pdfExport.exportPdf}
              disabled={pdfExport.isGenerating}
              className="justify-start sm:justify-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              {renderPdfButtonLabel(pdfExport.isGenerating, t)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualExportCard;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// The pdfmake chunk (~1 MB with its Greek-capable Roboto vfs) loads on the
// first click — the button says so instead of silently stalling.
const renderPdfButtonLabel = (isGenerating: boolean, t: TFunc): string => {
  if (isGenerating) return t('annualExport.generatingPdf');

  return t('annualExport.exportPdf');
};

const collectYearTransactions = (
  expenses: Expense[],
  incomes: Expense[],
  year: number,
): Expense[] => {
  const all: Expense[] = [...incomes, ...expenses];
  const filtered = all.filter((tx) => getYear(parseISO(tx.date)) === year);

  return filtered.sort((a, b) => a.date.localeCompare(b.date));
};
