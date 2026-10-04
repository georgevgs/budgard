import { trackProductEvent } from '@/common/api/productEventService';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { captureException } from '@/config/sentry';
import { dataService } from '@/common/api/dataService';
import { useDataConfig } from '@/common/contexts/DataContext';
import { toast } from '@/common/hooks/useToast';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { todayIso } from '@/constants/dates';
import { downloadBlob } from '@/constants/download';

// Full-account JSON export (data portability). Fetches everything fresh from
// the server so the file is complete even when the UI has only loaded recent
// history. Receipt images live in storage and are not included.
export const useDataExport = () => {
  const { activeOwnerId } = useFinancialSpace();
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
        dataService.getCategories(activeOwnerId),
        dataService.getTags(activeOwnerId),
        dataService.getExpenses(activeOwnerId),
        dataService.getIncomes(activeOwnerId),
        dataService.getRecurringExpenses(activeOwnerId),
        dataService.getRecurringIncomes(activeOwnerId),
        dataService.getTemplates(activeOwnerId),
        dataService.getCategoryBudgets(activeOwnerId),
        dataService.getGoals(activeOwnerId),
        dataService.getAccounts(activeOwnerId),
        dataService.getAllAccountBalances(activeOwnerId),
        dataService.getDebts(activeOwnerId),
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
      trackProductEvent({ name: 'data_export_completed' });
      toast({
        variant: 'success',
        title: t('settings.data.exportReady'),
      });
    } catch (error) {
      captureException(error, { tags: { context: 'dataExport' } });
      toast({
        variant: 'destructive',
        description: t('settings.data.exportFailed'),
      });
    }
    setIsExporting(false);
  }, [activeOwnerId, monthlyBudget, defaultCurrency, defaultSavingsPct, t]);

  return { isExporting, handleExport };
};

const buildFileName = (): string => {
  // The user's own calendar day, not the UTC one — see constants/dates.
  const stamp = todayIso();

  return `budgard-export-${stamp}.json`;
};

const downloadJson = (filename: string, payload: unknown): void => {
  downloadBlob(
    filename,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
};
