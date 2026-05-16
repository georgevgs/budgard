import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { cn, formatCurrency } from '@/lib/utils';
import { useIncomesData, useDataConfig } from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';

type NetCashFlowCardProps = {
  selectedMonth: string;
  monthlyExpenseTotal: number;
};

const NetCashFlowCard = ({
  selectedMonth,
  monthlyExpenseTotal,
}: NetCashFlowCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const incomes = useIncomesData();
  const { defaultCurrency } = useDataConfig();

  const monthlyIncomeTotal = useMemo(() => {
    return incomes
      .filter(
        (i: Expense) => format(parseISO(i.date), 'yyyy-MM') === selectedMonth,
      )
      .reduce((sum: number, i: Expense) => sum + i.amount, 0);
  }, [incomes, selectedMonth]);

  if (monthlyIncomeTotal === 0) return null;

  const net = monthlyIncomeTotal - monthlyExpenseTotal;
  const isPositive = net >= 0;
  const savingsRate =
    monthlyIncomeTotal > 0 ? (net / monthlyIncomeTotal) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => navigate('/analytics')}
      className="w-full text-left bg-card border border-border/40 rounded-2xl p-5 shadow-sm space-y-3 hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t('cashFlow.viewDetails')}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
          {t('income.netCashFlow')}
          <ChevronRight className="h-3.5 w-3.5" />
        </p>
        {renderSavingsRate(isPositive, savingsRate, t)}
      </div>

      <p
        className={cn(
          'text-3xl font-bold tracking-tight tabular-nums',
          isPositive && 'text-income',
          !isPositive && 'text-destructive',
        )}
      >
        {renderSignPrefix(isPositive)}
        {formatCurrency(net, defaultCurrency)}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownLeft className="h-3 w-3 text-income" />
            {t('income.title')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatCurrency(monthlyIncomeTotal, defaultCurrency)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3 w-3 text-destructive" />
            {t('expenses.title')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatCurrency(monthlyExpenseTotal, defaultCurrency)}
          </p>
        </div>
      </div>
    </button>
  );
};

export default NetCashFlowCard;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderSignPrefix = (isPositive: boolean) => {
  if (isPositive) {
    return '+';
  }

  return '';
};

const renderSavingsRate = (
  isPositive: boolean,
  rate: number,
  t: TranslateFunction,
) => {
  if (!isPositive) return null;

  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-income/10 text-income font-medium">
      {t('income.savingsRate', { rate: Math.round(rate) })}
    </span>
  );
};
