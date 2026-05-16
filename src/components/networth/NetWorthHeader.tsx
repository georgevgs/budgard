import { useTranslation } from 'react-i18next';
import { cn, formatCurrency } from '@/lib/utils';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import type { NetWorthSummary } from '@/hooks/useNetWorth';

type Props = {
  summary: NetWorthSummary;
  defaultCurrency: string;
}

const NetWorthHeader = ({ summary, defaultCurrency }: Props) => {
  const { t } = useTranslation();
  const animatedTotal = useAnimatedNumber(summary.total);
  const isPositive = summary.total >= 0;

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {t('networth.totalLabel')}
      </p>
      <p
        className={cn(
          'text-3xl font-bold tracking-tight tabular-nums',
          isPositive && 'text-foreground',
          !isPositive && 'text-destructive',
        )}
      >
        {formatCurrency(animatedTotal, defaultCurrency)}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowDownLeft className="h-3 w-3 text-income" />
            {t('networth.assetsLabel')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatCurrency(summary.assets, defaultCurrency)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpRight className="h-3 w-3 text-destructive" />
            {t('networth.liabilitiesLabel')}
          </div>
          <p className="text-base font-semibold tabular-nums mt-0.5">
            {formatCurrency(summary.liabilities, defaultCurrency)}
          </p>
        </div>
      </div>

      {renderInvestmentRow(summary, defaultCurrency, t)}
      {renderStaleRatesWarning(summary.staleCurrencies, t)}
    </div>
  );
}

export default NetWorthHeader;

// --- Helpers ---

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

const renderStaleRatesWarning = (
  staleCurrencies: string[],
  t: TranslateFunction,
) => {
  if (staleCurrencies.length === 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 pt-2 border-t border-border/40 text-xs text-amber-600 dark:text-amber-500">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        {t('networth.staleRatesWarning', {
          currencies: staleCurrencies.join(', '),
        })}
      </span>
    </div>
  );
};

const renderInvestmentRow = (
  summary: NetWorthSummary,
  defaultCurrency: string,
  t: TranslateFunction,
) => {
  if (summary.investmentValue === 0 && summary.investmentCostBasis === 0) {
    return null;
  }

  // Without a cost basis, "gain" and return % are undefined — show only the
  // current value rather than a misleading +0%.
  if (summary.investmentCostBasis <= 0) {
    return (
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          {t('networth.investmentLabel')}
        </div>
        <p className="text-sm font-semibold tabular-nums">
          {formatCurrency(summary.investmentValue, defaultCurrency)}
        </p>
      </div>
    );
  }

  const gain = summary.investmentGain;
  const isPositive = gain >= 0;
  const returnPct = (gain / summary.investmentCostBasis) * 100;

  return (
    <div className="flex items-center justify-between pt-2 border-t border-border/40">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        {t('networth.investmentLabel')}
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            isPositive && 'text-income',
            !isPositive && 'text-destructive',
          )}
        >
          {renderSignPrefix(isPositive)}
          {formatCurrency(gain, defaultCurrency)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {renderSignPrefix(isPositive)}
          {returnPct.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
