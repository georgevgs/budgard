import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ChartTooltipShell } from '@/components/common/ChartTooltip';
import type { Account } from '@/types/Account';

type Props = {
  accounts: Account[];
}

type Slice = {
  id: string;
  name: string;
  color: string;
  // recharts Pie reads each slice's color from the data's `fill` key
  fill: string;
  currency: string;
  value: number;
  pct: number;
}

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
        name: a.name,
        color: a.color,
        fill: a.color,
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
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-medium">
          {t('networth.allocation.title')}
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={28}
                  outerRadius={50}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    renderTooltip(Boolean(active), payload)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
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
      </CardContent>
    </Card>
  );
}

export default InvestmentAllocationCard;

// --- Helpers ---

type TooltipPayloadEntry = {
  payload?: Slice;
}

const renderTooltip = (
  active: boolean,
  payload: ReadonlyArray<TooltipPayloadEntry> | undefined,
) => {
  if (!active || !payload || payload.length === 0) return null;

  const slice = payload[0].payload;
  if (!slice) return null;

  return (
    <ChartTooltipShell title={slice.name}>
      <p className="tabular-nums text-muted-foreground">
        {formatCurrency(slice.value, slice.currency)} · {formatPercent(slice.pct, 1)}%
      </p>
    </ChartTooltipShell>
  );
}
