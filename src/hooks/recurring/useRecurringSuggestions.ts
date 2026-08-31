import { useEffect, useMemo, useState } from 'react';
import * as Sentry from '@/lib/sentry';
import { useTranslation } from 'react-i18next';
import {
  useExpensesData,
  useIncomesData,
  useRecurringData,
} from '@/contexts/DataContext';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';
import { useRecurringExpenseOps } from '@/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/hooks/dataOps/useRecurringIncomeOps';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useProGate } from '@/hooks/pro/useProGate';
import { recurringSuggestionService } from '@/services/recurringSuggestionService';
import { detectRecurringSuggestions } from '@/lib/recurringDetection';
import type { RecurringMode } from '@/hooks/recurring/useRecurringActions';
import type { RecurringSuggestion } from '@/types/RecurringSuggestion';

export const useRecurringSuggestions = (mode: RecurringMode) => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { activeOwnerId } = useFinancialSpace();
  const expenseOps = useRecurringExpenseOps();
  const incomeOps = useRecurringIncomeOps();
  const runMutation = useMutationRunner();
  const { allow } = useProGate();
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const controller = new AbortController();
    recurringSuggestionService
      .getDismissals(activeOwnerId, controller.signal)
      .then((rows) =>
        setDismissed(new Set(rows.map((row) => row.fingerprint))),
      )
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        Sentry.captureException(error, {
          tags: { context: 'loadRecurringSuggestionDismissals' },
        });
      });

    return () => controller.abort();
  }, [activeOwnerId]);

  const suggestions = useMemo(() => {
    const detected = detectRecurringSuggestions(
      [...expenses, ...incomes],
      [...recurringExpenses, ...recurringIncomes],
      dismissed,
    );

    return detected.filter((suggestion) => suggestion.type === mode);
  }, [expenses, incomes, recurringExpenses, recurringIncomes, dismissed, mode]);

  const accept = async (suggestion: RecurringSuggestion): Promise<void> => {
    if (
      suggestion.type === 'expense' &&
      !allow('recurringExpenses', recurringExpenses.length)
    ) {
      return;
    }

    const payload = {
      user_id: activeOwnerId,
      amount: suggestion.amount,
      description: suggestion.description,
      category_id: suggestion.categoryId,
      frequency: suggestion.frequency,
      start_date: suggestion.nextDate,
      active: true,
      type: suggestion.type,
      detection_source: 'suggested' as const,
      merchant_pattern: suggestion.merchantPattern,
    };

    if (suggestion.type === 'income') {
      await incomeOps.handleRecurringIncomeSubmit(payload);

      return;
    }
    await expenseOps.handleRecurringExpenseSubmit(payload);
  };

  const dismiss = async (suggestion: RecurringSuggestion): Promise<void> => {
    await runMutation({
      operation: 'dismissRecurringSuggestion',
      errorMessage: t('recurring.suggestions.dismissFailed'),
      successHaptic: 'none',
      optimistic: () => {
        const previous = dismissed;
        setDismissed((current) => new Set(current).add(suggestion.fingerprint));

        return () => setDismissed(previous);
      },
      perform: () =>
        recurringSuggestionService.dismiss(
          suggestion.fingerprint,
          activeOwnerId,
        ),
    });
  };

  return { suggestions, accept, dismiss };
};
