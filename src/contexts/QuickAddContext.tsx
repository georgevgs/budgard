import { createContext, useContext } from 'react';
import type { ReceiptOptions } from '@/hooks/dataOps/useExpenseOps';
import type { ExpenseWritePayload } from '@/services/dataService';
import type { Expense } from '@/types/Expense';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';

export type QuickAddValue = {
  /** Expenses with any in-flight add/edit/delete already applied. */
  optimisticExpenses: Expense[];
  handleExpenseEdit: (expense: Expense) => void;
  handleExpenseDelete: (id: string) => void;
  handleExpenseFormSubmit: (
    data: ExpenseWritePayload,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
  handleSaveAsTemplate: (expense: Expense) => void;
  handleUseTemplate: (template: ExpenseTemplate) => void;
  handleIncomeEdit: (income: Expense) => void;
  handleIncomeDelete: (id: string) => void;
};

export const QuickAddContext = createContext<QuickAddValue | null>(null);

// The add-transaction machinery — the floating action button, both form
// dialogs and the optimistic expense list — belongs to the whole authenticated
// shell rather than to a screen. Keeping one instance is what lets the same
// two actions appear on every tab AND lets an optimistically added row show up
// instantly in Today's and Activity's lists: two separate useOptimistic
// instances could not share that pending row.
export const useQuickAdd = (): QuickAddValue => {
  const context = useContext(QuickAddContext);
  if (!context) {
    throw new Error('useQuickAdd must be used within a QuickAddProvider');
  }

  return context;
};
