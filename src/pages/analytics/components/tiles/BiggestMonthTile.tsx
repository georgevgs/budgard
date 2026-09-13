import { useTranslation } from 'react-i18next';
import { useDataConfig } from '@/common/contexts/DataContext';
import { formatCurrency } from '@/constants/utils';
import { BentoTile, TileLabel } from '@/common/components/bento';

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  monthIndex: number;
  amount: number;
};

type BiggestMonthTileProps = {
  monthlyData: MonthlyDatum[];
  onMonthClick: (index: number) => void;
};

// The year's high-water mark, and a doorway into the month that set it —
// "which month was that" is the immediate next question, and the tile is the
// shortest possible route to the answer.
export const BiggestMonthTile = ({
  monthlyData,
  onMonthClick,
}: BiggestMonthTileProps) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const peak = findPeak(monthlyData);

  if (peak === null) {
    return null;
  }

  return (
    <BentoTile
      onClick={() => onMonthClick(peak.monthIndex)}
      ariaLabel={t('analytics.tile.biggestMonth')}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <TileLabel>{t('analytics.tile.biggestMonth')}</TileLabel>
      <div>
        <p className="type-figure">
          {formatCurrency(peak.amount, defaultCurrency)}
        </p>
        <p className="mt-1.5 whitespace-normal break-normal text-[0.72rem] leading-snug text-muted-foreground">
          {peak.month}
        </p>
      </div>
    </BentoTile>
  );
};

type Peak = {
  monthIndex: number;
  month: string;
  amount: number;
};

const findPeak = (monthlyData: MonthlyDatum[]): Peak | null => {
  let peak: Peak | null = null;

  monthlyData.forEach((datum) => {
    if (datum.amount <= 0) {
      return;
    }
    if (peak !== null && datum.amount <= peak.amount) {
      return;
    }
    peak = {
      monthIndex: datum.monthIndex,
      month: datum.month,
      amount: datum.amount,
    };
  });

  return peak;
};
