import { useTranslation } from 'react-i18next';
import { useCategoriesData, useTagsData } from '@/contexts/DataContext';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import ExpensesMonthlyOverview from '@/components/expenses/ExpensesMonthlyOverview';
import ExpensesFilter from '@/components/expenses/ExpensesFilter';
import ExpensesDashboardPanel from '@/components/expenses/ExpensesDashboardPanel';
import type { ExpensesFilterApi } from '@/hooks/useExpensesFilter';

type Props = {
  selectedMonth: string;
  currentMonth: string;
  onMonthChange: (month: string) => void;
  isDashboardVisible: boolean;
  onToggleDashboard: () => void;
  filter: ExpensesFilterApi;
  baseTotal: number;
  filteredTotal: number;
  monthlyTotal: number;
  allExpensesCount: number;
  onOpenImport: () => void;
};

const ExpensesOverviewSection = ({
  selectedMonth,
  currentMonth,
  onMonthChange,
  isDashboardVisible,
  onToggleDashboard,
  filter,
  baseTotal,
  filteredTotal,
  monthlyTotal,
  allExpensesCount,
  onOpenImport,
}: Props) => {
  const { t } = useTranslation();
  const { expenseCategories: categories } = useCategoriesData();
  const tags = useTagsData();

  return (
    <div className="space-y-3 mb-4">
      <ExpensesMonthlySelector
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
      />
      <ExpensesMonthlyOverview
        monthlyTotal={baseTotal}
        filteredTotal={filteredTotal}
        hasActiveFilters={filter.hasActiveFilters}
        selectedMonth={selectedMonth}
        currentMonth={currentMonth}
        isExpanded={isDashboardVisible}
        hasExpenses={filter.filteredExpenses.length > 0}
        expenses={filter.filteredExpenses}
        onCurrentMonthClick={() => onMonthChange(currentMonth)}
        onMonthlyTotalClick={onToggleDashboard}
      />

      <ExpensesFilter
        categories={categories}
        tags={tags}
        search={filter.search}
        selectedCategoryId={filter.selectedCategoryId}
        selectedTagId={filter.selectedTagId}
        sortOrder={filter.sortOrder}
        hasActiveFilters={filter.hasActiveFilters}
        isSearchingAllMonths={filter.isSearchingAllMonths}
        dateRangePreset={filter.dateRangePreset}
        onSearchChange={filter.setSearch}
        onCategoryChange={filter.setSelectedCategoryId}
        onTagChange={filter.setSelectedTagId}
        onSortChange={filter.setSortOrder}
        onSearchScopeChange={filter.setIsSearchingAllMonths}
        onDateRangeChange={filter.setDateRangePreset}
        onClearFilters={filter.handleClearFilters}
      />

      {renderSearchResultCount(
        filter.search,
        filter.filteredExpenses.length,
        getSearchScopeTotal(
          filter.isSearchingAllMonths,
          allExpensesCount,
          filter.monthlyExpenses.length,
        ),
        t,
      )}

      <ExpensesDashboardPanel
        isVisible={isDashboardVisible}
        monthlyTotal={monthlyTotal}
        expenses={filter.filteredExpenses}
        categories={categories}
        selectedMonth={selectedMonth}
        onOpenImport={onOpenImport}
      />
    </div>
  );
};

export default ExpensesOverviewSection;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getSearchScopeTotal = (
  isSearchingAllMonths: boolean,
  allMonthsCount: number,
  monthCount: number,
): number => {
  if (isSearchingAllMonths) return allMonthsCount;

  return monthCount;
};

const renderSearchResultCount = (
  search: string,
  filteredCount: number,
  totalCount: number,
  t: TranslateFunction,
) => {
  if (search.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground px-1">
      {t('expenses.search.resultCount', {
        count: filteredCount,
        total: totalCount,
      })}
    </p>
  );
};
