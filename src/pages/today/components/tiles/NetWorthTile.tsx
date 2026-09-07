import { useTranslation } from 'react-i18next';
import { useNetWorth } from '@/common/hooks/useNetWorth';
import { useDataConfig } from '@/common/contexts/DataContext';
import { formatCurrency } from '@/constants/utils';
import { BentoTile, TileLabel } from '@/common/components/bento';

// Off by default: it is the slowest-moving number in the app, and a home
// screen about this month should not lead with one that changes quarterly.
// Available to anyone who wants it in the grid, which is what Arrange is for.
export const NetWorthTile = () => {
  const { t } = useTranslation();
  const { summary, isComputing } = useNetWorth();
  const { defaultCurrency } = useDataConfig();

  return (
    <BentoTile
      to="/networth"
      ariaLabel={t('today.tiles.netWorth')}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <TileLabel>{t('today.tiles.netWorth')}</TileLabel>
      <p className="type-figure-sm">
        {renderTotal(summary.total, defaultCurrency, isComputing)}
      </p>
    </BentoTile>
  );
};

// Rates are still in flight on first paint. An em dash says "not yet" without
// flashing a number that is about to change under the user.
const renderTotal = (
  total: number,
  currency: string,
  isComputing: boolean,
): string => {
  if (isComputing) {
    return '—';
  }

  return formatCurrency(total, currency);
};
