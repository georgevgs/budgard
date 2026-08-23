import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDataConfig } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';

type Props = {
  monthlyAverage: number;
  monthsElapsed: number;
};

// Trends' one inverted tile — the figure every other number on the screen is
// implicitly measured against, so it is the one that gets to be loud.
//
// The months line is not decoration. It carries the average's denominator —
// a usual month drawn from three months of history is a different claim from
// one drawn from twelve — and it gives this tile the same label / figure /
// caption shape as the Biggest month tile beside it, which is what puts the
// two numbers on one line instead of half a caption apart.
const AveragePerMonthTile = ({ monthlyAverage, monthsElapsed }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();

  if (monthsElapsed === 0) {
    return null;
  }

  return (
    <BentoTile tone="ink" className="flex min-h-26 flex-col justify-between p-4">
      <TileLabel>{t('analytics.tile.averagePerMonth')}</TileLabel>
      <div>
        <p className="type-figure">
          {formatCurrency(monthlyAverage, defaultCurrency)}
        </p>
        <p className="mt-1.5 truncate text-[0.72rem] leading-none opacity-70">
          {t('analytics.tile.acrossMonths', { count: monthsElapsed })}
        </p>
      </div>
    </BentoTile>
  );
};

export default AveragePerMonthTile;
