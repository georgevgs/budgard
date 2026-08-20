import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, subMonths, subYears, type Locale } from 'date-fns';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils';
import {
  ChartTooltipShell,
  ChartTooltipRow,
} from '@/components/common/ChartTooltip';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useIsPro } from '@/hooks/useIsPro';

const VALUE_COLOR = 'hsl(var(--primary))';
const BASIS_COLOR = 'hsl(var(--muted-foreground))';

type RangeKey = '1m' | '3m' | '1y' | 'all';

type Props = {
  account: Account;
  snapshots: AccountBalance[];
}

type Point = {
  date: string;
  label: string;
  fullDate: string;
  balance: number;
  costBasis: number | null;
}

const AccountHistoryChart = ({ account, snapshots }: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const isPro = useIsPro();
  const isInvestment = account.kind === 'investment';
  // The cost-basis overlay is investment analytics — Pro only. The balance
  // area chart itself stays free for every account kind.
  const showBasis = isInvestment && isPro;
  const [range, setRange] = useState<RangeKey>('all');

  const data = useMemo<Point[]>(
    () => buildPoints(snapshots, isInvestment, dateLocale),
    [snapshots, isInvestment, dateLocale],
  );

  const visible = useMemo(() => filterByRange(data, range), [data, range]);

  if (data.length < 2) {
    return null;
  }

  return (
    <div className="w-full">
      {renderRangeTabs(range, setRange, t)}
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={visible}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="accountValueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={VALUE_COLOR} stopOpacity={0.4} />
              <stop offset="95%" stopColor={VALUE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            stroke="currentColor"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            stroke="currentColor"
            className="text-xs text-muted-foreground"
            tick={{ fill: 'currentColor', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              formatCurrencyCompact(Math.abs(value), account.default_currency)
            }
            width={60}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={({ active, payload }) =>
              renderTooltip({
                active: Boolean(active),
                payload,
                isInvestment: showBasis,
                currency: account.default_currency,
                t,
              })
            }
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={VALUE_COLOR}
            strokeWidth={2}
            fill="url(#accountValueGradient)"
          />
          {renderCostBasisLine(showBasis)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AccountHistoryChart;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const buildPoints = (
  snapshots: AccountBalance[],
  isInvestment: boolean,
  dateLocale: Locale | undefined,
): Point[] => {
  const sorted = [...snapshots].sort((a, b) =>
    a.recorded_at.localeCompare(b.recorded_at),
  );
  let runningBasis = 0;

  return sorted.map((snap) => {
    let costBasis: number | null = null;
    if (isInvestment) {
      if (snap.contribution_delta != null) {
        runningBasis += snap.contribution_delta;
      }
      costBasis = runningBasis;
    }

    return {
      date: snap.recorded_at,
      label: format(parseISO(snap.recorded_at), 'MMM d', {
        locale: dateLocale,
      }),
      fullDate: format(parseISO(snap.recorded_at), 'PPP', {
        locale: dateLocale,
      }),
      balance: snap.balance,
      costBasis,
    };
  });
};

const RANGES: ReadonlyArray<{ key: RangeKey; labelKey: string }> = [
  { key: '1m', labelKey: 'networth.chart.range1m' },
  { key: '3m', labelKey: 'networth.chart.range3m' },
  { key: '1y', labelKey: 'networth.chart.range1y' },
  { key: 'all', labelKey: 'networth.chart.rangeAll' },
];

const renderRangeTabs = (
  active: RangeKey,
  onChange: (key: RangeKey) => void,
  t: TranslateFunction,
) => (
  <div className="flex justify-end gap-1 pb-2">
    {RANGES.map((r) => (
      <button
        key={r.key}
        type="button"
        onClick={() => onChange(r.key)}
        className={cn(
          'text-xs font-medium px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          getRangeButtonClass(r.key === active),
        )}
      >
        {t(r.labelKey)}
      </button>
    ))}
  </div>
);

const getRangeButtonClass = (isActive: boolean): string => {
  if (isActive) {
    return 'bg-primary/10 text-primary-ink';
  }

  return 'text-muted-foreground hover:bg-muted/60';
};

const filterByRange = (data: Point[], range: RangeKey): Point[] => {
  if (range === 'all') return data;
  if (data.length === 0) return data;

  const now = new Date();
  let cutoff: Date;
  if (range === '1m') {
    cutoff = subMonths(now, 1);
  } else if (range === '3m') {
    cutoff = subMonths(now, 3);
  } else {
    cutoff = subYears(now, 1);
  }
  const cutoffStr = format(cutoff, 'yyyy-MM-dd');

  const inRange = data.filter((p) => p.date >= cutoffStr);
  // Keep at least one anchor before the window so the chart line starts
  // from a known point instead of free-floating.
  if (inRange.length === data.length) return data;
  if (inRange.length === 0) {
    return data.slice(-1);
  }

  const firstInRangeDate = inRange[0].date;
  const anchor = data.filter((p) => p.date < firstInRangeDate).slice(-1);

  return [...anchor, ...inRange];
};

const renderCostBasisLine = (isInvestment: boolean) => {
  if (!isInvestment) return null;

  return (
    <Line
      type="monotone"
      dataKey="costBasis"
      stroke={BASIS_COLOR}
      strokeWidth={1.5}
      strokeDasharray="4 4"
      dot={false}
      activeDot={false}
    />
  );
}

type TooltipPayloadEntry = {
  payload?: Point;
}

type TooltipArgs = {
  active: boolean;
  payload: ReadonlyArray<TooltipPayloadEntry> | undefined;
  isInvestment: boolean;
  currency: string;
  t: TranslateFunction;
}

const renderTooltip = ({
  active,
  payload,
  isInvestment,
  currency,
  t,
}: TooltipArgs) => {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  if (!point) return null;

  return (
    <ChartTooltipShell title={point.fullDate}>
      <ChartTooltipRow
        label={renderValueLabel(isInvestment, t)}
        labelClassName="text-muted-foreground"
        value={formatCurrency(point.balance, currency)}
        valueClassName="font-semibold"
      />
      {renderCostBasisRow(isInvestment, point, currency, t)}
    </ChartTooltipShell>
  );
}

const renderValueLabel = (isInvestment: boolean, t: TranslateFunction) => {
  if (isInvestment) {
    return t('networth.chart.value');
  }

  return t('networth.chart.balance');
}

const renderCostBasisRow = (
  isInvestment: boolean,
  point: Point,
  currency: string,
  t: TranslateFunction,
) => {
  if (!isInvestment) return null;
  if (point.costBasis == null) return null;

  return (
    <ChartTooltipRow
      label={t('networth.detail.costBasis')}
      labelClassName="text-muted-foreground"
      value={formatCurrency(point.costBasis, currency)}
    />
  );
}
