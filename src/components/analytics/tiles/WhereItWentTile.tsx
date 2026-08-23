import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { useDataConfig } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';

type Props = {
  breakdown: CategoryRow[];
  totalSpent: number;
  onCategoryClick: (category: CategoryRow) => void;
};

const TOP = 3;

// The year's spending as one bar and its three biggest names. The full list is
// still below — this is the answer most people came for, hoisted above it.
const WhereItWentTile = ({ breakdown, totalSpent, onCategoryClick }: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const leaders = breakdown.slice(0, TOP);

  if (leaders.length === 0) {
    return null;
  }

  return (
    <BentoTile wide className="px-4.5 py-4">
      <TileLabel>{t('analytics.tile.whereItWent')}</TileLabel>
      <div className="mt-3 flex h-2.5 gap-0.5" aria-hidden="true">
        {leaders.map((row) => renderSegment(row, totalSpent))}
        <span className="flex-1 rounded-full bg-border/70" />
      </div>
      <div className="mt-3.5 flex flex-col gap-2.5">
        {leaders.map((row) =>
          renderRow(row, defaultCurrency, onCategoryClick, t),
        )}
      </div>
    </BentoTile>
  );
};

export default WhereItWentTile;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const toShare = (amount: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }

  return (amount / total) * 100;
};

const renderSegment = (row: CategoryRow, totalSpent: number) => {
  return (
    <span
      key={row.id}
      className="rounded-full"
      style={{
        width: `${toShare(row.amount, totalSpent)}%`,
        backgroundColor: row.color,
      }}
    />
  );
};

const renderRow = (
  row: CategoryRow,
  currency: string,
  onCategoryClick: (category: CategoryRow) => void,
  t: TFunc,
) => {
  return (
    <button
      key={row.id}
      type="button"
      onClick={() => onCategoryClick(row)}
      aria-label={t('analytics.viewCategory', { category: row.name })}
      className="flex cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: row.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {row.name}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(row.amount, currency)}
      </span>
    </button>
  );
};
