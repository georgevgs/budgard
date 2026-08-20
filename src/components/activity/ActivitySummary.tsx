import { useTranslation } from 'react-i18next';
import ArrowDownLeft from 'lucide-react/dist/esm/icons/arrow-down-left';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import { formatCurrency, cn } from '@/lib/utils';

type Props = {
  expenseTotal: number;
  incomeTotal: number;
  currency: string;
};

const ActivitySummary = ({ expenseTotal, incomeTotal, currency }: Props) => {
  const { t } = useTranslation();
  const net = incomeTotal - expenseTotal;

  return (
    <section className="surface-card p-5">
      <p className="text-sm font-semibold text-muted-foreground">
        {t('activity.netChange')}
      </p>
      <p
        className={cn(
          'mt-1 font-display text-3xl font-bold tracking-[-0.035em] tabular-nums',
          getNetTone(net),
        )}
      >
        {getNetPrefix(net)}
        {formatCurrency(Math.abs(net), currency)}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-border/30 pt-4">
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            {t('activity.spent')}
          </dt>
          <dd className="mt-1 text-sm font-bold tabular-nums">
            {formatCurrency(expenseTotal, currency)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t('activity.received')}
          </dt>
          <dd className="mt-1 text-sm font-bold text-income-ink tabular-nums">
            {formatCurrency(incomeTotal, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default ActivitySummary;

// --- Helpers ---

const getNetPrefix = (net: number): string => {
  if (net > 0) {
    return '+';
  }
  if (net < 0) {
    return '−';
  }

  return '';
};

const getNetTone = (net: number): string => {
  if (net > 0) {
    return 'text-income-ink';
  }
  if (net < 0) {
    return 'text-foreground';
  }

  return 'text-muted-foreground';
};
