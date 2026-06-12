import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringExpenseOps } from '@/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/hooks/dataOps/useRecurringIncomeOps';
import { parseCurrencyInput } from '@/lib/utils';
import type { RecurringExpenseFormData } from '@/lib/validations';
import type { RecurringExpense } from '@/types/RecurringExpense';

export type RecurringMode = 'expense' | 'income';

type UseRecurringActionsArgs = {
  mode: RecurringMode;
  selectedExpense: RecurringExpense | undefined;
  onDone: () => void;
};

export const useRecurringActions = ({
  mode,
  selectedExpense,
  onDone,
}: UseRecurringActionsArgs) => {
  const { session } = useAuth();
  const {
    handleRecurringExpenseSubmit: submitRecurringExpense,
    handleRecurringExpenseDelete: deleteRecurringExpense,
    handleRecurringExpenseToggle: toggleRecurringExpense,
  } = useRecurringExpenseOps();
  const {
    handleRecurringIncomeSubmit: submitRecurringIncome,
    handleRecurringIncomeDelete: deleteRecurringIncome,
    handleRecurringIncomeToggle: toggleRecurringIncome,
  } = useRecurringIncomeOps();

  const handleSubmit = async (values: RecurringExpenseFormData) => {
    if (!session?.user?.id) return;

    try {
      let categoryId: string | null = values.category_id;
      if (values.category_id === 'none') {
        categoryId = null;
      }

      let endDate: string | null = null;
      if (values.end_date) {
        endDate = format(values.end_date, 'yyyy-MM-dd');
      }

      const data: Partial<RecurringExpense> = {
        amount: parseCurrencyInput(values.amount),
        description: values.description,
        category_id: categoryId,
        frequency: values.frequency,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: endDate,
        user_id: session.user.id,
      };

      if (mode === 'expense') {
        data.linked_account_id = values.linked_account_id ?? null;
      }

      if (mode === 'income') {
        await submitRecurringIncome(data, selectedExpense?.id);
      } else {
        await submitRecurringExpense(data, selectedExpense?.id);
      }

      onDone();
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (mode === 'income') {
        await deleteRecurringIncome(id);
      } else {
        await deleteRecurringExpense(id);
      }
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      if (mode === 'income') {
        await toggleRecurringIncome(id, active);
      } else {
        await toggleRecurringExpense(id, active);
      }
    } catch {
      // Error handling is done in the hook
    }
  };

  return { handleSubmit, handleDelete, handleToggle };
};
