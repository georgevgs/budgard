import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDebts } from '@/hooks/useDebts';
import { useDataConfig } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';

// What is still owed, and to how many places. Off by default, because a debts
// module on an account with no debts is a tile that only ever says zero — but
// once someone has switched it ON, zero is the answer they asked for. A tile
// that silently refuses to appear reads as a broken toggle, not as an empty
// state, which is why this does not return null the way the others do.
const DebtsTile = () => {
  const { t } = useTranslation();
  const { summary } = useDebts();
  const { defaultCurrency } = useDataConfig();

  return (
    <BentoTile
      to="/debts"
      ariaLabel={t('today.tiles.debts')}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <TileLabel>{t('today.tiles.debts')}</TileLabel>
      <div>
        <p className="type-figure-sm">
          {formatCurrency(summary.totalBalance, defaultCurrency)}
        </p>
        <p className="mt-1 text-[0.72rem] leading-none text-muted-foreground">
          {t('today.tile.debtCount', { count: summary.activeCount })}
        </p>
      </div>
    </BentoTile>
  );
};

export default DebtsTile;
