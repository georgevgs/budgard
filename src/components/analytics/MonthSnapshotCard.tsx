import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Minus from 'lucide-react/dist/esm/icons/minus';
import { Card, CardContent } from '@/components/ui/card';
import { useDataConfig } from '@/contexts/DataContext';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatCurrency } from '@/lib/utils';
import type { MonthComparison } from '@/hooks/analytics/useAnalyticsData';

type Props = {
  monthComparison: MonthComparison;
};

const MonthSnapshotCard = ({ monthComparison }: Props) => {
  const { t } = useTranslation();
  const { monthlyBudget, defaultCurrency } = useDataConfig();
  const animatedThisMonth = useAnimatedNumber(monthComparison.thisMonthAmount);

  const budgetUsedPercent = useMemo(() => {
    if (!monthlyBudget || monthlyBudget === 0) return null;

    return (monthComparison.thisMonthAmount / monthlyBudget) * 100;
  }, [monthComparison.thisMonthAmount, monthlyBudget]);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground mb-1">
          {monthComparison.thisMonthLabel}
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {formatCurrency(animatedThisMonth, defaultCurrency)}
          </p>
          {renderMonthChangeBadge(
            monthComparison.percentChange,
            monthComparison.delta,
            t,
          )}
        </div>
        {renderLastMonthContext(
          monthComparison.lastMonthAmount,
          monthComparison.lastMonthLabel,
          t,
          defaultCurrency,
        )}
        {renderBudgetProgress(
          budgetUsedPercent,
          monthlyBudget,
          t,
          defaultCurrency,
        )}
      </CardContent>
    </Card>
  );
};

export default MonthSnapshotCard;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderMonthChangeBadge = (
  percentChange: number | null,
  delta: number,
  t: TFunc,
) => {
  if (percentChange === null) return null;

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 rounded-full px-2.5 py-0.5">
        <TrendingUp className="h-3 w-3" />
        {t('analytics.vsLastMonthUp', { percent: percentChange.toFixed(1) })}
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-income bg-income/10 rounded-full px-2.5 py-0.5">
        <TrendingDown className="h-3 w-3" />
        {t('analytics.vsLastMonthDown', {
          percent: Math.abs(percentChange).toFixed(1),
        })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
      <Minus className="h-3 w-3" />
      {t('analytics.sameAsLastMonth')}
    </span>
  );
};

const renderLastMonthContext = (
  lastMonthAmount: number,
  lastMonthLabel: string,
  t: TFunc,
  currency: string,
) => {
  if (lastMonthAmount === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1.5">
      {t('analytics.vsLastMonthContext', {
        amount: formatCurrency(lastMonthAmount, currency),
        month: lastMonthLabel,
      })}
    </p>
  );
};

const renderBudgetProgress = (
  budgetUsedPercent: number | null,
  monthlyBudget: number | null,
  t: TFunc,
  currency: string,
) => {
  if (budgetUsedPercent === null || monthlyBudget === null) return null;

  const barWidth = Math.min(budgetUsedPercent, 100);

  let barClass = 'bg-primary';
  if (budgetUsedPercent > 90) {
    barClass = 'bg-destructive';
  } else if (budgetUsedPercent > 75) {
    barClass = 'bg-amber-500';
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>
          {t('analytics.budgetUsed', {
            percent: Math.round(budgetUsedPercent),
          })}
        </span>
        <span>{formatCurrency(monthlyBudget, currency)}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};
