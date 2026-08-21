import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import FormsManager from '@/components/layout/FormsManager';
import QuickAddSheet from '@/components/expenses/QuickAddSheet';
import SpeedDial from '@/components/layout/SpeedDial';
import IncomeFormDialog from '@/components/income/IncomeFormDialog';
import { QuickAddContext, type QuickAddValue } from '@/contexts/QuickAddContext';
import { useDataConfig } from '@/contexts/DataContext';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { useExpenseFormState } from '@/hooks/expensesList/useExpenseFormState';
import { useOpenFormFromUrl } from '@/hooks/expensesList/useOpenFormFromUrl';
import { useOptimisticExpenseActions } from '@/hooks/expensesList/useOptimisticExpenseActions';
import { useIncomeFormState } from '@/hooks/incomeList/useIncomeFormState';
import { isTransactionEntryPath } from '@/lib/routes';
import { FORM_TYPES } from '@/components/layout/formTypes';

type Props = {
  children: ReactNode;
};

const QuickAddProvider = ({ children }: Props) => {
  const { pathname } = useLocation();
  const { isInitialized } = useDataConfig();
  const expenseForm = useExpenseFormState();
  const incomeForm = useIncomeFormState();
  const expenseActions = useOptimisticExpenseActions();
  const { handleIncomeDelete } = useIncomeOps();

  useOpenFormFromUrl(isInitialized, expenseForm.setFormType);

  const value = useMemo<QuickAddValue>(
    () => ({
      optimisticExpenses: expenseActions.optimisticExpenses,
      handleExpenseEdit: expenseForm.handleExpenseEdit,
      handleExpenseDelete: expenseActions.handleExpenseDelete,
      handleExpenseFormSubmit: expenseActions.handleExpenseFormSubmit,
      handleSaveAsTemplate: expenseActions.handleSaveAsTemplate,
      handleUseTemplate: expenseActions.handleUseTemplate,
      handleIncomeEdit: incomeForm.handleIncomeEdit,
      handleIncomeDelete,
    }),
    [
      expenseActions.optimisticExpenses,
      expenseActions.handleExpenseDelete,
      expenseActions.handleExpenseFormSubmit,
      expenseActions.handleSaveAsTemplate,
      expenseActions.handleUseTemplate,
      expenseForm.handleExpenseEdit,
      incomeForm.handleIncomeEdit,
      handleIncomeDelete,
    ],
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <QuickAddSheet
        open={expenseForm.formType === FORM_TYPES.QUICK_ADD}
        onClose={expenseForm.handleFormClose}
        onSubmit={expenseActions.handleExpenseFormSubmit}
        onOpenFullForm={expenseForm.openFullForm}
      />
      <FormsManager
        formType={expenseForm.formType}
        onClose={expenseForm.handleFormClose}
        selectedExpense={expenseForm.selectedExpense}
        draft={expenseForm.draft}
        onExpenseSubmit={expenseActions.handleExpenseFormSubmit}
      />
      <IncomeFormDialog
        open={incomeForm.isFormOpen}
        income={incomeForm.selectedIncome}
        onClose={incomeForm.handleFormClose}
      />
      {renderSpeedDial(
        pathname,
        expenseForm.openNewExpenseForm,
        incomeForm.handleAddClick,
      )}
    </QuickAddContext.Provider>
  );
};

export default QuickAddProvider;

// --- Helpers ---

// Only the screens where adding a transaction IS the primary action — see
// TRANSACTION_ENTRY_PATHS. Everywhere else either owns a different add button
// (Net worth, Debts, Goals and Recurring each add their own kind of record,
// and two buttons cannot share the one dock slot) or is not a place you log
// anything at all.
const renderSpeedDial = (
  pathname: string,
  onAddExpense: () => void,
  onAddIncome: () => void,
) => {
  if (!isTransactionEntryPath(pathname)) {
    return null;
  }

  return <SpeedDial onAddExpense={onAddExpense} onAddIncome={onAddIncome} />;
};
