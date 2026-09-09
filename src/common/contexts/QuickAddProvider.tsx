import {
  Suspense,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { QuickAddSheet } from '@/pages/expenses/components/QuickAddSheet';
import { SpeedDial } from '@/common/components/layout/SpeedDial';
import {
  FormsManager,
  IncomeFormDialog,
} from '@/common/components/layout/lazyFormModules';
import {
  QuickAddContext,
  type QuickAddValue,
} from '@/common/contexts/QuickAddContext';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useIncomeOps } from '@/common/hooks/dataOps/useIncomeOps';
import { useExpenseFormState } from '@/pages/expenses/hooks/useExpenseFormState';
import { useOpenFormFromUrl } from '@/pages/expenses/hooks/useOpenFormFromUrl';
import { useOptimisticExpenseActions } from '@/pages/expenses/hooks/useOptimisticExpenseActions';
import { useIncomeFormState } from '@/pages/income/hooks/useIncomeFormState';
import { isTransactionEntryPath } from '@/constants/routes';
import { FORM_TYPES } from '@/common/components/layout/formTypes';

type QuickAddProviderProps = {
  children: ReactNode;
};

export const QuickAddProvider = ({ children }: QuickAddProviderProps) => {
  const { pathname } = useLocation();
  const { isInitialized } = useDataConfig();
  const expenseForm = useExpenseFormState();
  const incomeForm = useIncomeFormState();
  const expenseActions = useOptimisticExpenseActions();
  const { handleIncomeDelete } = useIncomeOps();
  // The full forms are lazy, so they can only be mounted once something asks
  // for them. Mounting stays sticky afterwards: unmounting on close would take
  // the exit animation with it, and would make every reopen suspend again.
  const [wasExpenseFormOpened, setWasExpenseFormOpened] = useState(false);
  const [wasIncomeFormOpened, setWasIncomeFormOpened] = useState(false);
  const isExpenseFormOpen =
    expenseForm.formType === FORM_TYPES.NEW_EXPENSE ||
    expenseForm.formType === FORM_TYPES.EDIT_EXPENSE;

  if (isExpenseFormOpen && !wasExpenseFormOpened) {
    setWasExpenseFormOpened(true);
  }
  if (incomeForm.isFormOpen && !wasIncomeFormOpened) {
    setWasIncomeFormOpened(true);
  }

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
        onUseTemplate={expenseActions.handleUseTemplate}
      />
      {renderExpenseForm(wasExpenseFormOpened, {
        formType: expenseForm.formType,
        onClose: expenseForm.handleFormClose,
        selectedExpense: expenseForm.selectedExpense,
        draft: expenseForm.draft,
        draftReceiptFile: expenseForm.draftReceiptFile,
        onExpenseSubmit: expenseActions.handleExpenseFormSubmit,
      })}
      {renderIncomeForm(wasIncomeFormOpened, {
        open: incomeForm.isFormOpen,
        income: incomeForm.selectedIncome,
        onClose: incomeForm.handleFormClose,
      })}
      {renderSpeedDial(
        pathname,
        expenseForm.openNewExpenseForm,
        incomeForm.handleAddClick,
      )}
    </QuickAddContext.Provider>
  );
};

// fallback={null} on purpose: the dialog is the thing being loaded, so a
// spinner would appear in the corner of a screen that has not dimmed yet.
// After the idle prefetch this resolves in the same frame anyway.
const renderExpenseForm = (
  isMounted: boolean,
  props: ComponentProps<typeof FormsManager>,
) => {
  if (!isMounted) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <FormsManager {...props} />
    </Suspense>
  );
};

const renderIncomeForm = (
  isMounted: boolean,
  props: ComponentProps<typeof IncomeFormDialog>,
) => {
  if (!isMounted) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <IncomeFormDialog {...props} />
    </Suspense>
  );
};

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
