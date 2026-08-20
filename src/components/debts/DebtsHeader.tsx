import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import type { DebtSummary } from '@/hooks/useDebts';

type Props = {
  summary: DebtSummary;
  defaultCurrency: string;
  monthsToDebtFree: number | null;
  payoffDate: string | null;
};

const DebtsHeader = ({
  summary,
  defaultCurrency,
  monthsToDebtFree,
  payoffDate,
}: Props) => {
  const { t } = useTranslation();
  const animatedTotal = useAnimatedNumber(summary.totalBalance);

  return (
    <SurfaceCard className="p-5 space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {t('debts.totalLabel')}
      </p>
      <p className="text-3xl font-bold tracking-tight tabular-nums text-destructive-ink">
        {formatCurrency(animatedTotal, defaultCurrency)}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            {t('debts.monthlyMinimumsLabel')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatCurrency(summary.totalMinimumPayment, defaultCurrency)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {t('debts.avgAprLabel')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatPercent(summary.weightedAverageApr, 2)}%
          </p>
        </div>
      </div>

      {renderPayoffRow(monthsToDebtFree, payoffDate, t)}
    </SurfaceCard>
  );
};

export default DebtsHeader;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderPayoffRow = (
  monthsToDebtFree: number | null,
  payoffDate: string | null,
  t: TranslateFunction,
) => {
  if (monthsToDebtFree === null || monthsToDebtFree <= 0 || !payoffDate) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pt-2 border-t border-border/40">
      <span className="text-xs text-muted-foreground">
        {t('debts.debtFreeIn')}
      </span>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {t('debts.monthsCount', { count: monthsToDebtFree })}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {payoffDate}
        </p>
      </div>
    </div>
  );
};
