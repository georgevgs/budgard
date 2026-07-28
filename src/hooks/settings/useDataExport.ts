import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@/lib/sentry';
import { dataService } from '@/services/dataService';
import { useDataConfig } from '@/contexts/DataContext';
import { toast } from '@/hooks/useToast';

// Full-account JSON export (data portability). Fetches everything fresh from
// the server so the file is complete even before the background history
// stream has finished. Receipt images live in storage and are not included.
export const useDataExport = () => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency, defaultSavingsPct } = useDataConfig();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const [
        categories,
        tags,
        expenses,
        incomes,
        recurringExpenses,
        recurringIncomes,
        templates,
        categoryBudgets,
        goals,
        accounts,
        accountBalances,
        debts,
      ] = await Promise.all([
        dataService.getCategories(),
        dataService.getTags(),
        dataService.getExpenses(),
        dataService.getIncomes(),
        dataService.getRecurringExpenses(),
        dataService.getRecurringIncomes(),
        dataService.getTemplates(),
        dataService.getCategoryBudgets(),
        dataService.getGoals(),
        dataService.getAccounts(),
        dataService.getAllAccountBalances(),
        dataService.getDebts(),
      ]);

      const payload = {
        app: 'Budgard',
        exported_at: new Date().toISOString(),
        settings: {
          monthly_budget: monthlyBudget,
          default_currency: defaultCurrency,
          default_savings_pct: defaultSavingsPct,
        },
        categories,
        tags,
        expenses,
        incomes,
        recurring_expenses: recurringExpenses,
        recurring_incomes: recurringIncomes,
        templates,
        category_budgets: categoryBudgets,
        goals,
        accounts,
        account_balances: accountBalances,
        debts,
      };

      downloadJson(buildFileName(), payload);
      toast({
        variant: 'success',
        title: t('settings.data.exportReady'),
      });
    } catch (error) {
      Sentry.captureException(error, { tags: { context: 'dataExport' } });
      toast({
        variant: 'destructive',
        description: t('settings.data.exportFailed'),
      });
    }
    setIsExporting(false);
  }, [monthlyBudget, defaultCurrency, defaultSavingsPct, t]);

  return { isExporting, handleExport };
};

// --- Helpers ---

const buildFileName = (): string => {
  const stamp = new Date().toISOString().slice(0, 10);

  return `budgard-export-${stamp}.json`;
};

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
