import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { cn, formatCurrency } from '@/lib/utils';
import type { DebtProgress } from '@/hooks/useDebtProgress';

type Props = {
  progress: DebtProgress;
  currency: string;
}

const DebtProgressBar = ({ progress, currency }: Props) => {
  const { t } = useTranslation();
  // Bar fills 0..100 only — negative progress (balance grew) reads as empty.
  const barValue = Math.max(0, Math.round(progress.percentPaid * 100));
  const isCleared = progress.currentBalance <= 0;
  const indicatorClass = pickIndicatorClass(progress, isCleared);

  return (
    <div className="space-y-2">
      <Progress
        value={barValue}
        className="h-2"
        indicatorClassName={indicatorClass}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {formatCurrency(progress.paidToDate, currency)}
          <span className="text-muted-foreground">
            {' / '}
            {formatCurrency(progress.originalPrincipal, currency)}
          </span>
        </span>
        <span className={cn('tabular-nums', getPercentClass(progress, isCleared))}>
          {renderPercentLabel(progress, isCleared, currency, t)}
        </span>
      </div>
    </div>
  );
}

export default DebtProgressBar;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const pickIndicatorClass = (progress: DebtProgress, isCleared: boolean) => {
  if (isCleared) return 'bg-income';
  if (progress.isUnpayable || progress.balanceIncreased) return 'bg-destructive';

  return 'bg-primary';
}

const getPercentClass = (progress: DebtProgress, isCleared: boolean) => {
  if (isCleared) return 'text-income font-semibold';
  if (progress.isUnpayable || progress.balanceIncreased) {
    return 'text-destructive font-medium';
  }

  return 'text-foreground';
}

const renderPercentLabel = (
  progress: DebtProgress,
  isCleared: boolean,
  currency: string,
  t: TranslateFunction,
) => {
  if (isCleared) return t('debts.cleared');
  if (progress.balanceIncreased) {
    return t('debts.balanceOverOriginal', {
      amount: formatCurrency(progress.balanceOverOriginal, currency),
    });
  }

  return t('debts.percentPaid', { percent: Math.round(progress.percentPaid * 100) });
}
