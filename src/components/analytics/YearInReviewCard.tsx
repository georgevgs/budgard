import { useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, getYear } from 'date-fns';
import type { Locale } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Download from 'lucide-react/dist/esm/icons/download';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency, dataUrlToBlob } from '@/lib/utils';
import { useData, useDataConfig } from '@/contexts/DataContext';
import type { Expense } from '@/types/Expense';

const TOP_CATEGORIES_LIMIT = 3;
const MINI_BAR_HEIGHT_PX = 28;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  year: number;
};

const YearInReviewCard = ({ isOpen, onClose, year }: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const { defaultCurrency } = useDataConfig();
  const { expenses, incomes, expenseCategories } = useData();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(
    () => computeYearStats(expenses, incomes, year, expenseCategories),
    [expenses, incomes, year, expenseCategories],
  );

  const lastYearTotal = useMemo(
    () => sumYear(expenses, year - 1),
    [expenses, year],
  );

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      const computedBg = getComputedStyle(cardRef.current).backgroundColor;

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: computedBg || '#0a0a0a',
      });

      if (navigator.share && navigator.canShare) {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], `budgard-${year}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${t('yearInReview.title')} — ${year}`,
            });
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              return;
            }
            throw error;
          }

          return;
        }
      }

      const link = document.createElement('a');
      link.download = `budgard-${year}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [year, t]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[420px] p-0 overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{t('yearInReview.title')}</DialogTitle>
        </DialogHeader>

        <div ref={cardRef} className="bg-card text-card-foreground px-6 pb-6 pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {t('yearInReview.label', { year })}
          </p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatCurrency(stats.totalSpent, defaultCurrency)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('yearInReview.spentSubtitle')}
          </p>

          {renderVsLastYear(lastYearTotal, stats.totalSpent, t, defaultCurrency)}
          {renderMonthlyMini(stats.monthly)}
          {renderHeadlineGrid(stats, t, defaultCurrency, dateLocale)}
          {renderTopCategories(stats.topCategories, t, defaultCurrency)}

          <div className="mt-5 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/50 tracking-wide">
              budgard.com
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button
            onClick={handleExport}
            disabled={isExporting || stats.totalSpent === 0}
            className="flex-1"
          >
            {renderShareButtonIcon(isExporting)}
            {renderShareLabel(t)}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || stats.totalSpent === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default YearInReviewCard;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type CategorySummary = {
  name: string;
  color: string;
  amount: number;
  percent: number;
};

type YearStats = {
  totalSpent: number;
  totalIncome: number;
  net: number;
  transactionCount: number;
  biggestExpense: Expense | null;
  topCategories: CategorySummary[];
  monthly: number[];
};

const renderShareButtonIcon = (isExporting: boolean) => {
  if (isExporting) {
    return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
  }

  return <Share2 className="h-4 w-4 mr-2" />;
};

const renderShareLabel = (t: TFunc) => {
  if (typeof navigator.share === 'function') {
    return t('report.share');
  }

  return t('report.saveImage');
};

const renderVsLastYear = (
  lastYearTotal: number,
  thisYearTotal: number,
  t: TFunc,
  currency: string,
) => {
  if (lastYearTotal === 0) return null;

  const delta = thisYearTotal - lastYearTotal;
  const percent = (delta / lastYearTotal) * 100;
  const verb = delta < 0 ? t('yearInReview.less') : t('yearInReview.more');

  return (
    <p className="text-xs text-muted-foreground mt-2">
      {t('yearInReview.vsLastYear', {
        amount: formatCurrency(lastYearTotal, currency),
        percent: Math.abs(percent).toFixed(0),
        verb,
      })}
    </p>
  );
};

const renderMonthlyMini = (monthly: number[]) => {
  const max = Math.max(...monthly, 1);

  return (
    <div className="mt-4 flex items-end gap-1" style={{ height: MINI_BAR_HEIGHT_PX }}>
      {monthly.map((amount, idx) => {
        const heightPct = (amount / max) * 100;

        return (
          <div
            key={idx}
            className="flex-1 rounded-sm bg-primary/70"
            style={{ height: `${Math.max(heightPct, 2)}%` }}
          />
        );
      })}
    </div>
  );
};

const renderHeadlineGrid = (
  stats: YearStats,
  t: TFunc,
  currency: string,
  dateLocale: Locale,
) => (
  <div className="mt-5 grid grid-cols-2 gap-3">
    {renderHeadline(
      t('yearInReview.income'),
      formatCurrency(stats.totalIncome, currency),
    )}
    {renderHeadline(
      t('yearInReview.net'),
      formatCurrency(stats.net, currency),
      stats.net < 0,
    )}
    {renderHeadline(
      t('yearInReview.transactions'),
      stats.transactionCount.toString(),
    )}
    {renderBiggestExpense(stats.biggestExpense, t, currency, dateLocale)}
  </div>
);

const renderHeadline = (label: string, value: string, isNegative = false) => (
  <div className="rounded-xl bg-muted/40 px-3 py-2">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
    <p
      className={`mt-0.5 text-sm font-semibold tabular-nums ${
        isNegative ? 'text-destructive' : ''
      }`}
    >
      {value}
    </p>
  </div>
);

const renderBiggestExpense = (
  expense: Expense | null,
  t: TFunc,
  currency: string,
  dateLocale: Locale,
) => {
  if (!expense) {
    return renderHeadline(t('yearInReview.biggest'), '—');
  }

  const dateLabel = format(parseISO(expense.date), 'd LLL', {
    locale: dateLocale,
  });

  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t('yearInReview.biggest')}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">
        {formatCurrency(expense.amount, currency)}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {expense.description} · {dateLabel}
      </p>
    </div>
  );
};

const renderTopCategories = (
  topCategories: CategorySummary[],
  t: TFunc,
  currency: string,
) => {
  if (topCategories.length === 0) return null;

  return (
    <div className="mt-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
        {t('yearInReview.topCategories')}
      </p>
      <div className="space-y-2">
        {topCategories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-sm flex-1 truncate">{cat.name}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(cat.amount, currency)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(cat.percent)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Pure compute helpers ────────────────────────────────────────────────────

type Category = { id: string; name: string; color: string };

const sumYear = (expenses: Expense[], year: number) =>
  expenses
    .filter((e) => getYear(parseISO(e.date)) === year)
    .reduce((sum, e) => sum + e.amount, 0);

const computeYearStats = (
  expenses: Expense[],
  incomes: Expense[],
  year: number,
  categories: Category[],
): YearStats => {
  const yearExpenses = expenses.filter(
    (e) => getYear(parseISO(e.date)) === year,
  );
  const yearIncomes = incomes.filter(
    (i) => getYear(parseISO(i.date)) === year,
  );

  const totalSpent = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = yearIncomes.reduce((sum, i) => sum + i.amount, 0);

  const monthly = new Array<number>(12).fill(0);
  const byCat = new Map<string, number>();
  let biggestExpense: Expense | null = null;

  for (const e of yearExpenses) {
    const monthIdx = parseISO(e.date).getMonth();
    monthly[monthIdx] += e.amount;

    if (e.category_id) {
      byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + e.amount);
    }

    if (!biggestExpense || e.amount > biggestExpense.amount) {
      biggestExpense = e;
    }
  }

  const topCategories: CategorySummary[] = categories
    .map((cat) => {
      const amount = byCat.get(cat.id) ?? 0;

      return {
        name: cat.name,
        color: cat.color,
        amount,
        percent: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_CATEGORIES_LIMIT);

  return {
    totalSpent,
    totalIncome,
    net: totalIncome - totalSpent,
    transactionCount: yearExpenses.length + yearIncomes.length,
    biggestExpense,
    topCategories,
    monthly,
  };
};
