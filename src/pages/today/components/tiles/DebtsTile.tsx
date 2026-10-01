import { useTranslation } from 'react-i18next';
import { useDebts } from '@/common/hooks/useDebts';
import { useDataConfig } from '@/common/contexts/DataContext';
import { formatCurrency } from '@/constants/utils';
import type { TranslateFunction } from '@/constants/translate';
import { BentoTile, TileLabel } from '@/common/components/bento';

// What is still owed, and to how many places. Off by default, because a debts
// module on an account with no debts is a tile that only ever says zero — but
// once someone has switched it ON, zero is the answer they asked for. A tile
// that silently refuses to appear reads as a broken toggle, not as an empty
// state, which is why this does not return null the way the others do.
export const DebtsTile = () => {
  const { t } = useTranslation();
  const { summary } = useDebts();
  const { defaultCurrency, isSecondaryLoaded } = useDataConfig();

  return (
    <BentoTile
      to="/debts"
      ariaLabel={t('today.tiles.debts')}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <TileLabel>{t('today.tiles.debts')}</TileLabel>
      <div>
        <p className="type-figure-sm">
          {renderBalance(
            summary.totalBalance,
            summary.currency ?? defaultCurrency,
            summary.hasMixedCurrencies,
            isSecondaryLoaded,
            t,
          )}
        </p>
        <p className="mt-1 text-[0.72rem] leading-none text-muted-foreground">
          {renderCount(summary.activeCount, isSecondaryLoaded, t)}
        </p>
      </div>
    </BentoTile>
  );
};

const renderBalance = (
  total: number | null,
  currency: string,
  hasMixedCurrencies: boolean,
  isReady: boolean,
  t: TranslateFunction,
): string => {
  if (!isReady) {
    return '—';
  }

  if (hasMixedCurrencies) {
    return t('debts.mixedCurrencies');
  }

  return formatCurrency(total ?? 0, currency);
};

const renderCount = (
  count: number,
  isReady: boolean,
  t: TranslateFunction,
): string => {
  if (!isReady) {
    return t('common.loading');
  }

  return t('today.tile.debtCount', { count });
};
