import { useEffect, useMemo, useState } from 'react';
import { captureException } from '@/config/sentry';
import { useTranslation } from 'react-i18next';
import {
  useExpensesData,
  useIncomesData,
  useRecurringData,
} from '@/common/contexts/DataContext';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { useRecurringExpenseOps } from '@/common/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/common/hooks/dataOps/useRecurringIncomeOps';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { useProGate } from '@/common/hooks/useProGate';
import { recurringSuggestionService } from '@/common/api/recurringSuggestionService';
import { detectRecurringSuggestions } from '@/pages/recurring/utils/recurringDetection';
import type { RecurringMode } from '@/pages/recurring/hooks/useRecurringActions';
import type { RecurringSuggestion } from '@/pages/recurring/recurringTypes';

type DismissalLoadState =
  | {
      ownerId: string;
      status: 'loading' | 'error';
    }
  | {
      ownerId: string;
      status: 'loaded';
      fingerprints: ReadonlySet<string>;
    };

const getDismissalStateForOwner = (
  state: DismissalLoadState | null,
  ownerId: string,
): DismissalLoadState | null => {
  if (state?.ownerId !== ownerId) {
    return null;
  }

  return state;
};

const getDismissals = (
  state: DismissalLoadState | null,
): ReadonlySet<string> | null => {
  if (state?.status !== 'loaded') {
    return null;
  }

  return state.fingerprints;
};

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
  const [dismissalState, setDismissalState] =
    useState<DismissalLoadState | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const currentState = getDismissalStateForOwner(dismissalState, activeOwnerId);
  const dismissed = getDismissals(currentState);
  const hasLoadError = currentState?.status === 'error';

  useEffect(() => {
    const controller = new AbortController();
    recurringSuggestionService
      .getDismissals(activeOwnerId, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) {
          return;
        }
        setDismissalState({
          ownerId: activeOwnerId,
          status: 'loaded',
          fingerprints: new Set(rows.map((row) => row.fingerprint)),
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        captureException(error, {
          tags: { context: 'loadRecurringSuggestionDismissals' },
        });
        setDismissalState({ ownerId: activeOwnerId, status: 'error' });
      });

    return () => controller.abort();
  }, [activeOwnerId, requestVersion]);

  const suggestions = useMemo(() => {
    if (!dismissed) {
      return [];
    }

    const detected = detectRecurringSuggestions(
      [...expenses, ...incomes],
      [...recurringExpenses, ...recurringIncomes],
      dismissed,
    );

    return detected.filter((suggestion) => suggestion.type === mode);
  }, [expenses, incomes, recurringExpenses, recurringIncomes, dismissed, mode]);

  const retry = () => {
    setDismissalState({ ownerId: activeOwnerId, status: 'loading' });
    setRequestVersion((version) => version + 1);
  };

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
        const previous = dismissalState;
        setDismissalState((current) => {
          const fingerprints = new Set<string>();
          if (
            current?.ownerId === activeOwnerId &&
            current.status === 'loaded'
          ) {
            current.fingerprints.forEach((fingerprint) =>
              fingerprints.add(fingerprint),
            );
          }
          fingerprints.add(suggestion.fingerprint);

          return { ownerId: activeOwnerId, status: 'loaded', fingerprints };
        });

        return () => {
          setDismissalState((current) => {
            if (current?.ownerId !== activeOwnerId) {
              return current;
            }

            return previous;
          });
        };
      },
      perform: () =>
        recurringSuggestionService.dismiss(
          suggestion.fingerprint,
          activeOwnerId,
        ),
    });
  };

  return { suggestions, hasLoadError, retry, accept, dismiss };
};
