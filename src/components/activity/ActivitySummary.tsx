import { useTranslation } from 'react-i18next';
import BentoGrid from '@/components/bento/BentoGrid';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { cn, formatCurrency } from '@/lib/utils';

type Props = {
  expenseTotal: number;
  incomeTotal: number;
  currency: string;
};

// Three figures, three tiles, the one that answers the question last. Out and
// in are raw facts; net is the verdict, so it takes the inverted tile and the
// eye lands on it after reading the two that produced it.
const ActivitySummary = ({ expenseTotal, incomeTotal, currency }: Props) => {
  const { t } = useTranslation();
  const net = incomeTotal - expenseTotal;

  return (
    <BentoGrid className="grid-cols-3">
      {renderStat(t('activity.spent'), formatCurrency(expenseTotal, currency))}
      {renderStat(
        t('activity.received'),
        formatCurrency(incomeTotal, currency),
        'text-income-ink',
      )}
      <BentoTile tone="ink" className="px-3 py-3.5">
        <TileLabel>{t('activity.netChange')}</TileLabel>
        <p className="mt-2.5 text-[0.9rem] font-semibold leading-none tabular-nums">
          {getNetPrefix(net)}
          {formatCurrency(Math.abs(net), currency)}
        </p>
      </BentoTile>
    </BentoGrid>
  );
};

export default ActivitySummary;

// --- Helpers ---

const renderStat = (label: string, value: string, tone?: string) => {
  return (
    <BentoTile key={label} className="px-3 py-3.5">
      <TileLabel>{label}</TileLabel>
      <p
        className={cn(
          'mt-2.5 text-[0.9rem] font-semibold leading-none tabular-nums',
          tone,
        )}
      >
        {value}
      </p>
    </BentoTile>
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
