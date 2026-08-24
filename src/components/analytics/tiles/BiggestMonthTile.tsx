import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDataConfig } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';

type MonthlyDatum = {
  month: string;
  fullMonth: string;
  amount: number;
};

type Props = {
  monthlyData: MonthlyDatum[];
  onMonthClick: (index: number) => void;
};

// The year's high-water mark, and a doorway into the month that set it —
// "which month was that" is the immediate next question, and the tile is the
// shortest possible route to the answer.
const BiggestMonthTile = ({ monthlyData, onMonthClick }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const peak = findPeak(monthlyData);

  if (peak === null) {
    return null;
  }

  return (
    <BentoTile
      onClick={() => onMonthClick(peak.index)}
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

export default BiggestMonthTile;

// --- Helpers ---

type Peak = {
  index: number;
  month: string;
  amount: number;
};

const findPeak = (monthlyData: MonthlyDatum[]): Peak | null => {
  let peak: Peak | null = null;

  monthlyData.forEach((datum, index) => {
    if (datum.amount <= 0) {
      return;
    }
    if (peak !== null && datum.amount <= peak.amount) {
      return;
    }
    peak = { index, month: datum.month, amount: datum.amount };
  });

  return peak;
};
