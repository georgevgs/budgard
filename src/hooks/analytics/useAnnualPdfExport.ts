import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useToast } from '@/hooks/useToast';
import { generateAnnualPdfReport } from '@/lib/pdfReport';
import type {
  AnnualPdfReportInput,
  PdfCategoryRow,
  PdfMonthlyTotal,
  PdfReportLabels,
} from '@/lib/pdfReport';
import { formatCurrency, monthsElapsedInYear } from '@/lib/utils';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

export const useAnnualPdfExport = (
  yearTransactions: Expense[],
  selectedYear: number,
) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { categories } = useCategoriesData();
  const { defaultCurrency } = useDataConfig();
  const dateLocale = useDateLocale();
  const [isGenerating, setIsGenerating] = useState(false);

  const exportPdf = async () => {
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    try {
      const input = buildReportInput(
        yearTransactions,
        categories,
        selectedYear,
        defaultCurrency,
        dateLocale,
        t,
      );
      await generateAnnualPdfReport(input);
      toast({
        title: t('annualExport.exportedTitle'),
        description: t('annualExport.exportedPdfDescription', {
          year: selectedYear,
        }),
      });
    } catch {
      toast({
        title: t('annualExport.pdfFailedTitle'),
        description: t('annualExport.pdfFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, exportPdf };
};

// --- Helpers ---

const buildReportInput = (
  yearTransactions: Expense[],
  categories: Category[],
  year: number,
  currency: string,
  dateLocale: Locale,
  t: TFunc,
): AnnualPdfReportInput => {
  const yearExpenses = yearTransactions.filter(isExpenseTransaction);
  const yearIncomes = yearTransactions.filter(isIncomeTransaction);
  const totalSpent = sumAmounts(yearExpenses);
  const monthsElapsed = monthsElapsedInYear(year);

  let monthlyAverage = 0;
  if (monthsElapsed > 0) {
    monthlyAverage = totalSpent / monthsElapsed;
  }

  return {
    year,
    currency,
    labels: buildLabels(t, dateLocale),
    totalSpent: formatCurrency(totalSpent, currency),
    totalIncome: buildIncomeTotal(yearIncomes, currency),
    monthlyAverage: formatCurrency(monthlyAverage, currency),
    monthlyTotals: buildMonthlyTotals(yearExpenses, year, currency, dateLocale),
    categoryBreakdown: buildCategoryRows(
      yearExpenses,
      categories,
      totalSpent,
      currency,
      t,
    ),
  };
};

const buildLabels = (t: TFunc, dateLocale: Locale): PdfReportLabels => {
  const generatedDate = format(new Date(), 'PPP', { locale: dateLocale });

  return {
    generatedOn: t('annualExport.pdf.generatedOn', { date: generatedDate }),
    summaryTitle: t('annualExport.pdf.summary'),
    totalSpent: t('annualExport.pdf.totalSpent'),
    totalIncome: t('annualExport.pdf.totalIncome'),
    monthlyAverage: t('annualExport.pdf.monthlyAverage'),
    monthlyTitle: t('annualExport.pdf.monthlyTotals'),
    monthHeader: t('annualExport.pdf.month'),
    amountHeader: t('annualExport.pdf.amount'),
    categoriesTitle: t('annualExport.pdf.categories'),
    categoryHeader: t('annualExport.pdf.category'),
    percentHeader: t('annualExport.pdf.percent'),
  };
};

const buildIncomeTotal = (
  yearIncomes: Expense[],
  currency: string,
): string | null => {
  if (yearIncomes.length === 0) {
    return null;
  }

  return formatCurrency(sumAmounts(yearIncomes), currency);
};

const buildMonthlyTotals = (
  yearExpenses: Expense[],
  year: number,
  currency: string,
  dateLocale: Locale,
): PdfMonthlyTotal[] => {
  // YYYY-MM-DD dates: slicing the month straight off the string matches the
  // bucketing pattern in useAnalyticsData (parseISO only for labels).
  const totals = new Map<string, number>();
  for (const expense of yearExpenses) {
    const key = expense.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + expense.amount);
  }

  return Array.from({ length: 12 }, (_, index): PdfMonthlyTotal => {
    const month = (index + 1).toString().padStart(2, '0');
    const key = `${year}-${month}`;

    return {
      monthLabel: format(parseISO(`${key}-01`), 'LLLL', { locale: dateLocale }),
      amount: formatCurrency(totals.get(key) ?? 0, currency),
    };
  });
};

const buildCategoryRows = (
  yearExpenses: Expense[],
  categories: Category[],
  totalSpent: number,
  currency: string,
  t: TFunc,
): PdfCategoryRow[] => {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  const uncategorizedLabel = t('annualExport.csv.uncategorized');
  const totalsByName = new Map<string, number>();

  for (const expense of yearExpenses) {
    const name = resolveCategoryName(expense.category_id, nameById, uncategorizedLabel);
    totalsByName.set(name, (totalsByName.get(name) ?? 0) + expense.amount);
  }

  return Array.from(totalsByName.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]): PdfCategoryRow => {
      return {
        name,
        amount: formatCurrency(amount, currency),
        percent: buildPercentLabel(amount, totalSpent),
      };
    });
};

const resolveCategoryName = (
  categoryId: string | null | undefined,
  nameById: Map<string, string>,
  fallback: string,
): string => {
  if (!categoryId) {
    return fallback;
  }

  return nameById.get(categoryId) ?? fallback;
};

const buildPercentLabel = (amount: number, totalSpent: number): string => {
  if (totalSpent <= 0) {
    return '0%';
  }

  return `${Math.round((amount / totalSpent) * 100)}%`;
};

const isExpenseTransaction = (transaction: Expense): boolean => {
  return transaction.type !== 'income';
};

const isIncomeTransaction = (transaction: Expense): boolean => {
  return transaction.type === 'income';
};

const sumAmounts = (transactions: Expense[]): number => {
  return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
};
