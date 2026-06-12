import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDataConfig } from '@/contexts/DataContext';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { useSeedIncomeCategories } from '@/hooks/incomeList/useSeedIncomeCategories';
import { useMonthlyIncomes } from '@/hooks/incomeList/useMonthlyIncomes';
import { useIncomeFormState } from '@/hooks/incomeList/useIncomeFormState';
import { formatCurrency } from '@/lib/utils';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import IncomeCard from '@/components/income/IncomeCard';
import IncomeEmpty from '@/components/income/IncomeEmpty';
import IncomeFormDialog from '@/components/income/IncomeFormDialog';
import NetCashFlowCard from '@/components/income/NetCashFlowCard';
import FiftyThirtyTwentyRing from '@/components/income/FiftyThirtyTwentyRing';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import type { Expense } from '@/types/Expense';

const IncomeList = () => {
  const { t } = useTranslation();
  const { isInitialized, defaultCurrency } = useDataConfig();
  const { handleIncomeDelete } = useIncomeOps();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const formState = useIncomeFormState();

  useSeedIncomeCategories();

  const { monthlyIncomes, filteredIncomes, monthlyTotal, monthlyExpenseTotal } =
    useMonthlyIncomes(selectedMonth, search);
  const animatedTotal = useAnimatedNumber(monthlyTotal);

  if (!isInitialized) {
    return <ExpenseLoadingState />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-58px)]">
      <div className="flex-1 container max-w-4xl mx-auto px-4 pt-5 pb-4">
        <div className="space-y-3 mb-4">
          <ExpensesMonthlySelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />

          {renderMonthlyTotalCard(
            animatedTotal,
            defaultCurrency,
            monthlyIncomes.length,
            t,
          )}

          <NetCashFlowCard
            selectedMonth={selectedMonth}
            monthlyExpenseTotal={monthlyExpenseTotal}
          />

          <FiftyThirtyTwentyRing selectedMonth={selectedMonth} />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('income.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label={t('income.searchLabel')}
            />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {renderIncomeContent(
            filteredIncomes,
            monthlyIncomes,
            search,
            selectedMonth,
            formState.handleAddClick,
            formState.handleIncomeEdit,
            handleIncomeDelete,
            t,
          )}
        </div>
      </div>

      <IncomeFormDialog
        open={formState.isFormOpen}
        income={formState.selectedIncome}
        onClose={formState.handleFormClose}
      />

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 pb-safe-b">
        <Button
          size="icon"
          onClick={formState.handleAddClick}
          className="h-14 w-14 rounded-full shadow-lg shadow-income/30 bg-income text-income-foreground hover:bg-income/90"
          aria-label={t('income.addIncome')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default IncomeList;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderMonthlyTotalCard = (
  animatedTotal: number,
  defaultCurrency: string,
  incomeCount: number,
  t: TranslateFunction,
) => {
  return (
    <div className="flex flex-col gap-4 bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {t('income.monthlyTotal')}
        </p>
        <p className="text-3xl font-bold tracking-tight tabular-nums text-income">
          +{formatCurrency(animatedTotal, defaultCurrency)}
        </p>
        {renderIncomeCount(incomeCount, t)}
      </div>
    </div>
  );
};

const renderIncomeCount = (count: number, t: TranslateFunction) => {
  if (count === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1">
      {t('income.entryCount', { count })}
    </p>
  );
};

const renderIncomeContent = (
  filteredIncomes: Expense[],
  monthlyIncomes: Expense[],
  search: string,
  selectedMonth: string,
  onAddClick: () => void,
  onEdit: (income: Expense) => void,
  onDelete: (id: string) => void,
  t: TranslateFunction,
) => {
  if (monthlyIncomes.length === 0) {
    return <IncomeEmpty selectedMonth={selectedMonth} onAddClick={onAddClick} />;
  }

  if (filteredIncomes.length === 0 && search.length > 0) {
    return (
      <div
        className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-border/40"
        role="status"
      >
        <p className="text-sm text-muted-foreground">
          {t('income.noResultsFor', { query: search })}
        </p>
      </div>
    );
  }

  return filteredIncomes.map((income) => (
    <IncomeCard
      key={income.id}
      income={income}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  ));
};
