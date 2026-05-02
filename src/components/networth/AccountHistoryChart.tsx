import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

const VALUE_COLOR = 'hsl(var(--primary))';
const BASIS_COLOR = 'hsl(var(--muted-foreground))';

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
  const { t, i18n } = useTranslation();
  let dateLocale = enUS;
  if (i18n.language === 'el') {
    dateLocale = el;
  }
  const currencySymbol = getCurrencySymbol(account.default_currency);
  const isInvestment = account.kind === 'investment';

  const data = useMemo<Point[]>(() => {
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
  }, [snapshots, isInvestment, dateLocale]);

  if (data.length < 2) {
    return null;
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={data}
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
              `${Math.abs(value).toLocaleString()}${currencySymbol}`
            }
            width={60}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
            content={({ active, payload }) =>
              renderTooltip({
                active: Boolean(active),
                payload,
                isInvestment,
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
          {renderCostBasisLine(isInvestment)}
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
    <div className="rounded-xl bg-popover border border-border/40 shadow-md p-3 text-xs space-y-1.5">
      <p className="font-medium text-foreground">{point.fullDate}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">
          {renderValueLabel(isInvestment, t)}
        </span>
        <span className="tabular-nums font-semibold">
          {formatCurrency(point.balance, currency)}
        </span>
      </div>
      {renderCostBasisRow(isInvestment, point, currency, t)}
    </div>
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
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">
        {t('networth.detail.costBasis')}
      </span>
      <span className="tabular-nums">
        {formatCurrency(point.costBasis, currency)}
      </span>
    </div>
  );
}
