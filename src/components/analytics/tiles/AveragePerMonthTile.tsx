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
const AveragePerMonthTile = ({ monthlyAverage, monthsElapsed }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();

  if (monthsElapsed === 0) {
    return null;
  }

  return (
    <BentoTile tone="ink" className="flex min-h-30 flex-col justify-between p-4">
      <TileLabel>{t('analytics.tile.averagePerMonth')}</TileLabel>
      <p className="type-figure">
        {formatCurrency(monthlyAverage, defaultCurrency)}
      </p>
    </BentoTile>
  );
};

export default AveragePerMonthTile;
