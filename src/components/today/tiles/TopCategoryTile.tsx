import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { formatCurrency } from '@/lib/utils';
import type { TopCategory } from '@/hooks/today/useTopCategory';

type Props = {
  category: TopCategory | null;
  currency: string;
};

// The grid's one inverted tile. It is the loudest thing here that costs no
// colour, which is why there is exactly one — a second would flatten the
// first, and the slab has to stay the only thing shouting.
const TopCategoryTile = ({ category, currency }: Props) => {
  const { t } = useTranslation();

  if (category === null) {
    return null;
  }

  return (
    <BentoTile
      tone="ink"
      to="/trends"
      ariaLabel={t('today.tiles.topCategory')}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <TileLabel>{t('today.tiles.topCategory')}</TileLabel>
        {renderIcon(category.icon)}
      </div>
      <div>
        <p className="truncate text-sm font-medium">{category.name}</p>
        <p className="mt-1.5 type-figure-sm">
          {formatCurrency(category.amount, currency)}
        </p>
      </div>
    </BentoTile>
  );
};

export default TopCategoryTile;

// --- Helpers ---

const renderIcon = (icon: string | null) => {
  if (!icon) {
    return null;
  }

  return (
    <span aria-hidden="true" className="text-sm leading-none">
      {icon}
    </span>
  );
};
