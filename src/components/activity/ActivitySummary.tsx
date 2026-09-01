import { useTranslation } from 'react-i18next';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import TileLabel from '@/components/bento/TileLabel';
import { cn, formatCurrency } from '@/lib/utils';

type Props = {
  expenseTotal: number;
  incomeTotal: number;
  currency: string;
};

// The totals remain available without making every visit scan past a second
// dashboard before reaching the transactions.
const ActivitySummary = ({ expenseTotal, incomeTotal, currency }: Props) => {
  const { t } = useTranslation();
  const net = incomeTotal - expenseTotal;

  return (
    <details className="group">
      <summary className="surface-card flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {t('activity.summaryTitle')}
        <ChevronDown
          className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="surface-card mt-3 grid grid-cols-3 divide-x divide-border/40 px-1 py-3">
        {renderStat(
          t('activity.spent'),
          formatCurrency(expenseTotal, currency),
        )}
        {renderStat(
          t('activity.received'),
          formatCurrency(incomeTotal, currency),
          'text-income-ink',
        )}
        <div className="min-w-0 px-2 text-center">
          <TileLabel className="truncate">{t('activity.netChange')}</TileLabel>
          <p className="mt-2 type-figure-sm text-[0.875rem]">
            {getNetPrefix(net)}
            {formatCurrency(Math.abs(net), currency)}
          </p>
        </div>
      </div>
    </details>
  );
};

export default ActivitySummary;

// --- Helpers ---

const renderStat = (label: string, value: string, tone?: string) => {
  return (
    <div key={label} className="min-w-0 px-2 text-center">
      <TileLabel className="truncate">{label}</TileLabel>
      <p className={cn('mt-2 type-figure-sm text-[0.875rem]', tone)}>{value}</p>
    </div>
  );
};

const getNetPrefix = (net: number): string => {
  if (net > 0) {
    return '+';
  }
  if (net < 0) {
    return '−';
  }

  return '';
};
