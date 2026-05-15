import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
  useDataConfig,
  useExpensesData,
  useIncomesData,
  useCategoriesData,
} from '@/contexts/DataContext';
import { useIncomeOps } from '@/hooks/dataOps/useIncomeOps';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { formatCurrency } from '@/lib/utils';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import IncomeForm from '@/components/income/IncomeForm';
import IncomeCard from '@/components/income/IncomeCard';
import IncomeEmpty from '@/components/income/IncomeEmpty';
import NetCashFlowCard from '@/components/income/NetCashFlowCard';
import FiftyThirtyTwentyRing from '@/components/income/FiftyThirtyTwentyRing';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import type { Expense } from '@/types/Expense';

const DEFAULT_INCOME_CATEGORIES: Array<{
  nameKey: string;
  color: string;
  icon: string;
}> = [
  { nameKey: 'income.defaults.salary', color: '#10b981', icon: '💼' },
  { nameKey: 'income.defaults.freelance', color: '#22c55e', icon: '💻' },
  { nameKey: 'income.defaults.refund', color: '#06b6d4', icon: '↩️' },
  { nameKey: 'income.defaults.gift', color: '#a855f7', icon: '🎁' },
  { nameKey: 'income.defaults.investment', color: '#3b82f6', icon: '📈' },
];

const IncomeList = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const incomes = useIncomesData();
  const expenses = useExpensesData();
  const { incomeCategories } = useCategoriesData();
  const { isInitialized, defaultCurrency } = useDataConfig();
  const { handleIncomeDelete } = useIncomeOps();
  const { handleCategoriesAddBulk } = useCategoryOps();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [selectedIncome, setSelectedIncome] = useState<Expense | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const seededRef = useRef(false);

  // Seed default income categories once when none exist
  useEffect(() => {
    if (!isInitialized) return;
    if (seededRef.current) return;
    if (!session?.user?.id) return;
    if (incomeCategories.length > 0) return;

    seededRef.current = true;
    const userId = session.user.id;
    const seedData = DEFAULT_INCOME_CATEGORIES.map((c) => ({
      name: t(c.nameKey),
      color: c.color,
      icon: c.icon,
      user_id: userId,
      type: 'income' as const,
      kind: 'income' as const,
    }));

    handleCategoriesAddBulk(seedData).catch(() => {
      seededRef.current = false;
    });
  }, [
    isInitialized,
    incomeCategories.length,
    session?.user?.id,
    handleCategoriesAddBulk,
    t,
  ]);

  const monthlyIncomes = useMemo(() => {
    return incomes.filter(
      (income) => format(parseISO(income.date), 'yyyy-MM') === selectedMonth,
    );
  }, [incomes, selectedMonth]);

  const filteredIncomes = useMemo(() => {
    if (!search.trim()) return monthlyIncomes;
    const lower = search.toLowerCase();

    return monthlyIncomes.filter((i) => {
      return (
        i.description.toLowerCase().includes(lower) ||
        (i.category?.name.toLowerCase().includes(lower) ?? false)
      );
    });
  }, [monthlyIncomes, search]);

  const monthlyTotal = useMemo(
    () => monthlyIncomes.reduce((sum, i) => sum + i.amount, 0),
    [monthlyIncomes],
  );

  const monthlyExpenseTotal = useMemo(() => {
    return expenses
      .filter((e) => format(parseISO(e.date), 'yyyy-MM') === selectedMonth)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedMonth]);

  const animatedTotal = useAnimatedNumber(monthlyTotal);

  const handleIncomeEdit = useCallback((income: Expense) => {
    if (income.id.startsWith('temp-')) return;
    setSelectedIncome(income);
    setIsFormOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setSelectedIncome(undefined);
    setIsFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedIncome(undefined);
  }, []);

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

          <div className="flex flex-col gap-4 bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('income.monthlyTotal')}
              </p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-income">
                +{formatCurrency(animatedTotal, defaultCurrency)}
              </p>
              {renderIncomeCount(monthlyIncomes.length, t)}
            </div>
          </div>

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
            handleAddClick,
            handleIncomeEdit,
            handleIncomeDelete,
            t,
          )}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
          aria-describedby="income-form-description"
          onOpenChange={handleFormClose}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <div id="income-form-description" className="sr-only">
            {t('income.formDescription')}
          </div>
          <IncomeForm income={selectedIncome} onClose={handleFormClose} />
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <div className="fixed bottom-24 right-4 z-50 pb-safe-b">
        <Button
          size="icon"
          onClick={handleAddClick}
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
