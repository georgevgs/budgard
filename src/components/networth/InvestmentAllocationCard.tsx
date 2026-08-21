import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SurfaceCard from '@/components/common/SurfaceCard';
import DonutChart, { type DonutSlice } from '@/components/charts/DonutChart';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { Account } from '@/types/Account';

type Props = {
  accounts: Account[];
}

type Slice = DonutSlice & {
  name: string;
  currency: string;
  pct: number;
};

const InvestmentAllocationCard = ({ accounts }: Props) => {
  const { t } = useTranslation();

  const slices = useMemo<Slice[]>(() => {
    const total = accounts.reduce((sum, a) => sum + a.current_balance, 0);
    if (total <= 0) {
      return [];
    }

    return accounts
      .filter((a) => a.current_balance > 0)
      .map((a) => ({
        id: a.id,
        label: a.name,
        name: a.name,
        color: a.color,
        currency: a.default_currency,
        value: a.current_balance,
        pct: (a.current_balance / total) * 100,
      }))
      .sort((a, b) => b.value - a.value);
  }, [accounts]);

  if (accounts.length < 2 || slices.length < 2) {
    return null;
  }

  return (
    <SurfaceCard>
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-medium">
          {t('networth.allocation.title')}
        </h3>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <DonutChart
              slices={slices}
              size={112}
              thickness={22}
              renderTooltip={(slice) => renderSliceTooltip(slice, slices)}
              ariaLabel={t('networth.allocation.summary', {
                count: slices.length,
                top: slices[0].name,
                pct: formatPercent(slices[0].pct, 0),
              })}
            />
          </div>
          <ul className="flex-1 min-w-0 space-y-1.5">
            {slices.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                <span className="truncate flex-1">{s.name}</span>
                <span className="tabular-nums text-muted-foreground shrink-0">
                  {formatPercent(s.pct, 0)}%
                </span>
                <span className="tabular-nums font-medium shrink-0">
                  {formatCurrency(s.value, s.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default InvestmentAllocationCard;

// --- Helpers ---

const renderSliceTooltip = (slice: DonutSlice, slices: Slice[]) => {
  const detail = slices.find((item) => item.id === slice.id);
  if (!detail) {
    return null;
  }

  return (
    <>
      <p className="font-medium text-foreground">{detail.name}</p>
      <p className="mt-0.5 tabular-nums text-muted-foreground">
        {formatCurrency(detail.value, detail.currency)} ·{' '}
        {formatPercent(detail.pct, 1)}%
      </p>
    </>
  );
};
