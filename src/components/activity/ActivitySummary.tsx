import { useTranslation } from 'react-i18next';
import TileLabel from '@/components/bento/TileLabel';
import { cn, formatCurrency } from '@/lib/utils';

type Props = {
  expenseTotal: number;
  incomeTotal: number;
  currency: string;
};

// A compact ledger summary, not three competing modules. The feed is the main
// event on Activity; these numbers stay available without pushing it down.
const ActivitySummary = ({ expenseTotal, incomeTotal, currency }: Props) => {
  const { t } = useTranslation();
  const net = incomeTotal - expenseTotal;

  return (
    <div className="surface-card grid grid-cols-3 divide-x divide-border/40 px-1 py-3">
      {renderStat(t('activity.spent'), formatCurrency(expenseTotal, currency))}
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
