import { useTranslation } from 'react-i18next';
import Download from 'lucide-react/dist/esm/icons/download';
import Upload from 'lucide-react/dist/esm/icons/upload';
import { cn } from '@/lib/utils';
import { downloadExpensesAsCSV } from '@/lib/csvExport';
import { Button } from '@/components/ui/button';
import BudgetProgress from '@/components/budget/BudgetProgress';
import ExpensesDashboard from '@/components/expenses/ExpensesDashboard';
import { useDataConfig } from '@/contexts/DataContext';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

type Props = {
  isVisible: boolean;
  monthlyTotal: number;
  expenses: Expense[];
  categories: Category[];
  selectedMonth: string;
  onOpenImport: () => void;
};

const ExpensesDashboardPanel = ({
  isVisible,
  monthlyTotal,
  expenses,
  categories,
  selectedMonth,
  onOpenImport,
}: Props) => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const { handleBudgetUpdate } = useBudgetOps();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();

  const handleExport = () => {
    if (!isPro) {
      openUpgrade();

      return;
    }

    downloadExpensesAsCSV({ expenses, categories, selectedMonth });
  };

  return (
    <div
      className={cn(
        'grid transition-all duration-200 ease-in-out',
        getDashboardRowsClass(isVisible),
      )}
    >
      <div className="overflow-hidden space-y-3">
        {/* Budget Progress */}
        <BudgetProgress
          monthlyBudget={monthlyBudget}
          monthlySpent={monthlyTotal}
          onBudgetUpdate={handleBudgetUpdate}
          currencyCode={defaultCurrency}
        />

        {renderDashboard(expenses, categories)}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImport}
            className="text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('import.importCSV')}
          </Button>
          {renderExportButton(expenses.length, handleExport, t)}
        </div>
      </div>
    </div>
  );
};

export default ExpensesDashboardPanel;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getDashboardRowsClass = (isVisible: boolean): string => {
  if (isVisible) return 'grid-rows-[1fr] opacity-100';

  return 'grid-rows-[0fr] opacity-0';
};

const renderDashboard = (expenses: Expense[], categories: Category[]) => {
  if (expenses.length === 0) return null;

  return <ExpensesDashboard expenses={expenses} categories={categories} />;
};

const renderExportButton = (
  expenseCount: number,
  onExport: () => void,
  t: TranslateFunction,
) => {
  if (expenseCount === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      className="text-muted-foreground hover:text-foreground"
    >
      <Download className="h-4 w-4 mr-2" />
      {t('expenses.exportCSV')}
    </Button>
  );
};
