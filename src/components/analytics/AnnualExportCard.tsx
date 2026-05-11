import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseISO, getYear } from 'date-fns';
import Download from 'lucide-react/dist/esm/icons/download';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useExpensesData,
  useIncomesData,
  useCategoriesData,
  useTagsData,
} from '@/contexts/DataContext';
import { useToast } from '@/hooks/useToast';
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
      <h3 className="text-base font-semibold text-foreground">
        {t('annualExport.title', { year: selectedYear })}
      </h3>

      <Card>
        <CardContent className="p-5 space-y-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnnualExportCard;

// --- Helpers ---

const collectYearTransactions = (
  expenses: Expense[],
  incomes: Expense[],
  year: number,
): Expense[] => {
  const all: Expense[] = [...incomes, ...expenses];
  const filtered = all.filter((tx) => getYear(parseISO(tx.date)) === year);

  return filtered.sort((a, b) => a.date.localeCompare(b.date));
};
