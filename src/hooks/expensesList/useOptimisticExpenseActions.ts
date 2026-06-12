import { useCallback, useOptimistic, useTransition } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  useExpensesData,
  useCategoriesData,
  useTagsData,
} from '@/contexts/DataContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import type { Expense } from '@/types/Expense';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

export const useOptimisticExpenseActions = () => {
  const { session } = useAuth();
  const expenses = useExpensesData();
  const { expenseCategories: categories } = useCategoriesData();
  const tags = useTagsData();
  const {
    handleExpenseDelete: deleteExpense,
    handleExpenseSubmit: submitExpense,
  } = useExpenseOps();
  const { handleTemplateCreate } = useTemplateOps();
  const [optimisticExpenses, addOptimisticExpense] = useOptimistic(
    expenses,
    expensesReducer,
  );
  const [, startTransition] = useTransition();

  const handleExpenseDelete = useCallback(
    (id: string) => {
      if (id.startsWith('temp-')) return;
      startTransition(async () => {
        addOptimisticExpense({ type: 'delete', id });
        await deleteExpense(id);
      });
    },
    [addOptimisticExpense, deleteExpense],
  );

  const handleExpenseFormSubmit = useCallback(
    (
      data: Partial<Expense>,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ) => {
      startTransition(async () => {
        const category = categories.find((c) => c.id === data.category_id);
        const tag = tags.find((t) => t.id === data.tag_id);

        if (expenseId) {
          const existing = optimisticExpenses.find((e) => e.id === expenseId);
          if (existing) {
            addOptimisticExpense({
              type: 'update',
              expense: { ...existing, ...data, category, tag },
            });
          }
        } else {
          addOptimisticExpense({
            type: 'add',
            expense: {
              id: `temp-${Date.now()}`,
              user_id: data.user_id!,
              amount: data.amount!,
              description: data.description!,
              date: data.date!,
              category_id: data.category_id,
              tag_id: data.tag_id,
              category,
              tag,
              receipt_path: null,
              created_at: new Date().toISOString(),
            },
          });
        }

        await submitExpense(data, expenseId, receiptOptions);
      });
    },
    [addOptimisticExpense, categories, tags, optimisticExpenses, submitExpense],
  );

  const handleSaveAsTemplate = useCallback(
    (expense: Expense) => {
      handleTemplateCreate({
        amount: expense.amount,
        description: expense.description,
        category_id: expense.category_id ?? null,
        tag_id: expense.tag_id ?? null,
        original_currency: expense.original_currency ?? null,
      });
    },
    [handleTemplateCreate],
  );

  const handleUseTemplate = useCallback(
    (template: ExpenseTemplate) => {
      if (!session?.user?.id) return;

      const userId = session.user.id;
      const today = format(new Date(), 'yyyy-MM-dd');
      const category = categories.find((c) => c.id === template.category_id);
      const tag = tags.find((t) => t.id === template.tag_id);

      startTransition(async () => {
        addOptimisticExpense({
          type: 'add',
          expense: {
            id: `temp-${Date.now()}`,
            user_id: userId,
            amount: template.amount,
            description: template.description,
            date: today,
            category_id: template.category_id,
            tag_id: template.tag_id,
            category,
            tag,
            receipt_path: null,
            created_at: new Date().toISOString(),
          },
        });

        await submitExpense({
          amount: template.amount,
          description: template.description,
          category_id: template.category_id,
          tag_id: template.tag_id,
          date: today,
          user_id: userId,
        });
      });
    },
    [session?.user?.id, addOptimisticExpense, categories, tags, submitExpense],
  );

  return {
    optimisticExpenses,
    handleExpenseDelete,
    handleExpenseFormSubmit,
    handleSaveAsTemplate,
    handleUseTemplate,
  };
};

// --- Helpers ---

type OptimisticAction =
  | { type: 'add'; expense: Expense }
  | { type: 'update'; expense: Expense }
  | { type: 'delete'; id: string };

const expensesReducer = (
  state: Expense[],
  action: OptimisticAction,
): Expense[] => {
  switch (action.type) {
    case 'add':
      return [action.expense, ...state];
    case 'update':
      return state.map((e) => {
        if (e.id === action.expense.id) return action.expense;

        return e;
      });
    case 'delete':
      return state.filter((e) => e.id !== action.id);
  }
};
