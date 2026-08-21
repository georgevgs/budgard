import type { ReactNode } from 'react';
import { useDataLayer } from '@/hooks/data/useDataLayer';
import {
  DataActionsContext,
  DataConfigContext,
  ExpensesDataContext,
  IncomesDataContext,
  CategoriesDataContext,
  TagsDataContext,
  TemplatesDataContext,
  RecurringDataContext,
  GoalsDataContext,
  AccountsDataContext,
  DebtsDataContext,
  CategoryBudgetsDataContext,
  NoSpendDaysDataContext,
} from '@/contexts/DataContext';

// Thirteen contexts rather than one: a mutation to expenses must not re-render
// every consumer of the category list. All of the logic behind them lives in
// useDataLayer — this file is the tree that distributes it.
export const DataProvider = ({ children }: { children: ReactNode }) => {
  const {
    actions,
    config,
    categoriesSlice,
    recurringSlice,
    accountsSlice,
    expenses,
    incomes,
    tags,
    templates,
    goals,
    debts,
    categoryBudgets,
    noSpendDays,
  } = useDataLayer();

  return (
    <DataActionsContext.Provider value={actions}>
      <DataConfigContext.Provider value={config}>
        <ExpensesDataContext.Provider value={expenses}>
          <IncomesDataContext.Provider value={incomes}>
            <CategoriesDataContext.Provider value={categoriesSlice}>
              <TagsDataContext.Provider value={tags}>
                <TemplatesDataContext.Provider value={templates}>
                  <RecurringDataContext.Provider value={recurringSlice}>
                    <GoalsDataContext.Provider value={goals}>
                      <AccountsDataContext.Provider value={accountsSlice}>
                        <DebtsDataContext.Provider value={debts}>
                          <CategoryBudgetsDataContext.Provider
                            value={categoryBudgets}
                          >
                            <NoSpendDaysDataContext.Provider
                              value={noSpendDays}
                            >
                              {children}
                            </NoSpendDaysDataContext.Provider>
                          </CategoryBudgetsDataContext.Provider>
                        </DebtsDataContext.Provider>
                      </AccountsDataContext.Provider>
                    </GoalsDataContext.Provider>
                  </RecurringDataContext.Provider>
                </TemplatesDataContext.Provider>
              </TagsDataContext.Provider>
            </CategoriesDataContext.Provider>
          </IncomesDataContext.Provider>
        </ExpensesDataContext.Provider>
      </DataConfigContext.Provider>
    </DataActionsContext.Provider>
  );
};
