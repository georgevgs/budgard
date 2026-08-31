import { useState } from 'react';
import {
  useAccountsData,
  useCategoriesData,
  useDataConfig,
  useRecurringData,
} from '@/contexts/DataContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useProGate } from '@/hooks/pro/useProGate';
import {
  useRecurringActions,
  type RecurringMode,
} from '@/hooks/recurring/useRecurringActions';
import { getMonthlyAmount } from '@/lib/recurring';
import type { RecurringExpense } from '@/types/RecurringExpense';
import { useRecurringSuggestions } from '@/hooks/recurring/useRecurringSuggestions';

// The screen shows two lists behind one toggle — recurring expenses and
// recurring incomes — and the mode decides which data, which categories and
// which cap apply. Holding all of that here keeps the component to layout.
export const useRecurringList = () => {
  const [mode, setMode] = useState<RecurringMode>('expense');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<
    RecurringExpense | undefined
  >(undefined);

  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { expenseCategories, incomeCategories } = useCategoriesData();
  const { accounts } = useAccountsData();
  const { defaultCurrency, isInitialized } = useDataConfig();
  const { allow } = useProGate();
  const showSkeleton = useDelayedLoading(!isInitialized);
  const suggestions = useRecurringSuggestions(mode);

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedExpense(undefined);
  };

  const actions = useRecurringActions({
    mode,
    selectedExpense,
    onDone: closeForm,
  });

  const isIncome = mode === 'income';
  const items = pick(isIncome, recurringIncomes, recurringExpenses);
  const categories = pick(isIncome, incomeCategories, expenseCategories);
  const activeItems = items.filter((item) => item.active);

  // The free cap applies to recurring expenses only; recurring incomes stay
  // uncapped on every plan.
  const handleAddClick = () => {
    // Recurring incomes stay uncapped on every plan, so only expenses are
    // counted against the free limit.
    if (!isIncome && !allow('recurringExpenses', recurringExpenses.length)) {
      return;
    }

    setIsFormOpen(true);
  };

  return {
    mode,
    setMode,
    items,
    categories,
    activeCount: activeItems.length,
    monthlyTotal: activeItems.reduce(
      (sum, item) => sum + getMonthlyAmount(item),
      0,
    ),
    investmentAccounts: accounts.filter(
      (account) => account.kind === 'investment' && !account.is_archived,
    ),
    defaultCurrency,
    isInitialized,
    showSkeleton,
    isFormOpen,
    selectedExpense,
    openForm: () => setIsFormOpen(true),
    closeForm,
    handleAddClick,
    handleEdit: (expense: RecurringExpense) => {
      setSelectedExpense(expense);
      setIsFormOpen(true);
    },
    handleSubmit: actions.handleSubmit,
    handleDelete: actions.handleDelete,
    handleToggle: actions.handleToggle,
    suggestions: suggestions.suggestions,
    handleSuggestionAccept: suggestions.accept,
    handleSuggestionDismiss: suggestions.dismiss,
  };
};

// --- Helpers ---

const pick = <T,>(isIncome: boolean, income: T, expense: T): T => {
  if (isIncome) {
    return income;
  }

  return expense;
};
