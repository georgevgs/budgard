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
import type { ExpenseWritePayload } from '@/services/dataService';
import type { Expense } from '@/types/Expense';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { EmbeddedTag, Tag } from '@/types/Tag';

export const useOptimisticExpenseActions = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;
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
      data: ExpenseWritePayload,
      expenseId?: string,
      receiptOptions?: ReceiptOptions,
    ) => {
      startTransition(async () => {
        // extra_tag_ids is a write-only field — strip it from the optimistic
        // row and mirror it as resolved extra_tags so the UI is correct
        // before the server responds.
        const { extra_tag_ids, ...rowData } = data;
        const category = categories.find((c) => c.id === rowData.category_id);
        const tag = tags.find((t) => t.id === rowData.tag_id);
        const extraTags = resolveExtraTags(extra_tag_ids, tags);

        if (expenseId) {
          const existing = optimisticExpenses.find((e) => e.id === expenseId);
          if (existing) {
            addOptimisticExpense({
              type: 'update',
              expense: {
                ...existing,
                ...rowData,
                category,
                tag,
                extra_tags: extraTags ?? existing.extra_tags,
              },
            });
          }
        } else {
          addOptimisticExpense({
            type: 'add',
            expense: {
              id: `temp-${Date.now()}`,
              user_id: rowData.user_id!,
              amount: rowData.amount!,
              description: rowData.description!,
              date: rowData.date!,
              category_id: rowData.category_id,
              tag_id: rowData.tag_id,
              category,
              tag,
              extra_tags: extraTags ?? [],
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
      if (!userId) return;

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
    [userId, addOptimisticExpense, categories, tags, submitExpense],
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

const resolveExtraTags = (
  extraTagIds: string[] | undefined,
  tags: Tag[],
): EmbeddedTag[] | undefined => {
  if (!extraTagIds) return undefined;

  const resolved: EmbeddedTag[] = [];
  for (const id of extraTagIds) {
    const tag = tags.find((candidate) => candidate.id === id);
    if (tag) {
      resolved.push({ id: tag.id, name: tag.name, color: tag.color });
    }
  }

  return resolved;
};

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
