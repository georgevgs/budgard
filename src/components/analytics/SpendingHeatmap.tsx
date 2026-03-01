import { useMemo, useState } from 'react';
import {
  format,
  getISODay,
  eachDayOfInterval,
  differenceInDays,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils.ts';
import type { Expense } from '@/types/Expense';

interface SpendingHeatmapProps {
  expenses: Expense[];
  selectedYear: number;
  dateLocale: Locale;
}

type HoveredCell = {
  dateLabel: string;
  amount: number;
  col: number;
  row: number;
} | null;

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const LABEL_W = 20;

const LABELED_ROWS = new Set([0, 2, 4]); // Mon, Wed, Fri

const SpendingHeatmap = ({
  expenses,
  selectedYear,
  dateLocale,
}: SpendingHeatmapProps) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState<HoveredCell>(null);

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const key = e.date.slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return map;
  }, [expenses]);

  const maxAmount = useMemo(
    () => Math.max(...dailyTotals.values(), 0),
    [dailyTotals],
  );

  const { days, totalCols, monthLabels } = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

    // ISO day: Mon=1 … Sun=7 → offset 0-6
    const startOffset = getISODay(yearStart) - 1;

    const days = allDays.map((date, i) => ({
      date,
      key: format(date, 'yyyy-MM-dd'),
      col: Math.floor((i + startOffset) / 7),
      row: (i + startOffset) % 7,
      amount: dailyTotals.get(format(date, 'yyyy-MM-dd')) ?? 0,
    }));

    const totalCols = Math.ceil((allDays.length + startOffset) / 7);

    const seenCols = new Set<number>();
    const monthLabels: { col: number; label: string }[] = [];
    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(selectedYear, m, 1);
      const idx = differenceInDays(firstDay, yearStart);
      const col = Math.floor((idx + startOffset) / 7);
      if (!seenCols.has(col)) {
        seenCols.add(col);
        monthLabels.push({
          col,
          label: format(firstDay, 'MMM', { locale: dateLocale }),
        });
      }
    }

    return { days, totalCols, monthLabels };
  }, [selectedYear, dailyTotals, dateLocale]);

  // Mon=0 … Sun=6 → single-letter label for rows 0, 2, 4
  const dowLabels = useMemo(() => {
    // Jan 1 2024 is a Monday — use as anchor for day-name lookup
    const anchor = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      if (!LABELED_ROWS.has(i)) return '';
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return format(d, 'EEEEE', { locale: dateLocale });
    });
  }, [dateLocale]);

  const getLevel = (amount: number): 0 | 1 | 2 | 3 | 4 => {
    if (amount === 0 || maxAmount === 0) return 0;
    const r = amount / maxAmount;
    if (r < 0.25) return 1;
    if (r < 0.5) return 2;
    if (r < 0.75) return 3;
    return 4;
  };

  const levelClass = (level: 0 | 1 | 2 | 3 | 4): string => {
    const classes: Record<number, string> = {
      0: 'bg-muted/50',
      1: 'bg-primary/20',
      2: 'bg-primary/45',
      3: 'bg-primary/70',
      4: 'bg-primary',
    };
    return classes[level];
  };

  const gridW = totalCols * STEP;
  const gridH = 7 * STEP - GAP;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t('analytics.heatmap.title')}
        </h3>
        <div className="overflow-x-auto pb-1">
          <div
            className="relative inline-block"
            style={{ width: LABEL_W + gridW }}
          >
            {/* Month labels */}
            <div
              className="relative h-4 mb-1"
              style={{ marginLeft: LABEL_W }}
            >
              {monthLabels.map(({ col, label }) => (
                <span
                  key={label}
                  className="absolute text-[10px] text-muted-foreground leading-none"
                  style={{ left: col * STEP }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex">
              {/* Day-of-week labels */}
              <div
                className="flex flex-col shrink-0"
                style={{ width: LABEL_W, gap: GAP }}
              >
                {dowLabels.map((label, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-muted-foreground flex items-center"
                    style={{ height: CELL }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Cell grid */}
              <div className="relative" style={{ width: gridW, height: gridH }}>
                {days.map(({ key, col, row, amount, date }) => {
                  const level = getLevel(amount);
                  return (
                    <div
                      key={key}
                      className={`absolute rounded-[2px] cursor-default ${levelClass(level)} ${amount > 0 ? 'hover:ring-1 hover:ring-primary/60' : ''}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        left: col * STEP,
                        top: row * STEP,
                      }}
                      onMouseEnter={() => {
                        setHovered(
                          amount > 0
                            ? {
                                dateLabel: format(date, 'MMM d, yyyy', {
                                  locale: dateLocale,
                                }),
                                amount,
                                col,
                                row,
                              }
                            : null,
                        );
                      }}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}

                {/* Tooltip */}
                {hovered !== null && (
                  <div
                    className="absolute z-20 pointer-events-none bg-popover border border-border rounded-md px-2 py-1.5 text-xs shadow-md whitespace-nowrap"
                    style={{
                      left: hovered.col * STEP + CELL / 2,
                      top:
                        hovered.row >= 4
                          ? hovered.row * STEP - 44
                          : hovered.row * STEP + CELL + 4,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <p className="font-medium">{hovered.dateLabel}</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(hovered.amount)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-1 mt-3 justify-end">
              <span className="text-[10px] text-muted-foreground mr-1">
                {t('analytics.heatmap.less')}
              </span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <div
                  key={level}
                  className={`rounded-[2px] ${levelClass(level)}`}
                  style={{ width: CELL, height: CELL }}
                />
              ))}
              <span className="text-[10px] text-muted-foreground ml-1">
                {t('analytics.heatmap.more')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingHeatmap;
