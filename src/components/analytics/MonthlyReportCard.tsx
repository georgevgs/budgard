import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useDataConfig } from '@/contexts/DataContext';
import type { Category } from '@/types/Category';

type CategorySummary = {
  name: string;
  color: string;
  amount: number;
  percent: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  monthLabel: string;
  totalSpent: number;
  lastMonthAmount: number;
  monthlyBudget: number | null;
  categories: Category[];
  expensesByCategory: Map<string, number>;
};

const MAX_TOP_CATEGORIES = 4;

const MonthlyReportCard = ({
  isOpen,
  onClose,
  monthLabel,
  totalSpent,
  lastMonthAmount,
  monthlyBudget,
  categories,
  expensesByCategory,
}: Props) => {
  const { t } = useTranslation();
  const { defaultCurrency } = useDataConfig();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const topCategories: CategorySummary[] = categories
    .map((cat) => {
      const amount = expensesByCategory.get(cat.id) ?? 0;

      return {
        name: cat.name,
        color: cat.color,
        amount,
        percent: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_TOP_CATEGORIES);

  const budgetPercent =
    monthlyBudget && monthlyBudget > 0
      ? Math.round((totalSpent / monthlyBudget) * 100)
      : null;

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Resolve the actual bg-card color from CSS variables
      const computedBg = getComputedStyle(cardRef.current).backgroundColor;

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: computedBg || '#0a0a0a',
      });

      // Try native share on mobile, fallback to download
      if (navigator.share && navigator.canShare) {
        const blob = dataUrlToBlob(dataUrl);
        const file = new File([blob], `budgard-${monthLabel}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${t('report.title')} — ${monthLabel}`,
            });
          } catch (error) {
            // User cancelled the share sheet — not an error
            if (error instanceof DOMException && error.name === 'AbortError') {
              return;
            }
            throw error;
          }

          return;
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = `budgard-${monthLabel}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  }, [monthLabel, t]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[400px] p-0 overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{t('report.title')}</DialogTitle>
        </DialogHeader>

        {/* The exportable card */}
        <div ref={cardRef} className="bg-card text-card-foreground px-6 pb-6 pt-2">
          {/* Month + Total */}
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {monthLabel}
          </p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {formatCurrency(totalSpent, defaultCurrency)}
          </p>

          {/* Budget bar */}
          {renderBudgetSection(budgetPercent, monthlyBudget, t, defaultCurrency)}

          {/* vs Last month */}
          {renderLastMonthComparison(lastMonthAmount, t, defaultCurrency)}

          {/* Top categories */}
          {renderTopCategories(topCategories, t, defaultCurrency)}

          {/* Branding */}
          <div className="mt-5 pt-3 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/50 tracking-wide">
              budgard.com
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <Button
            onClick={handleExport}
            disabled={isExporting || totalSpent === 0}
            className="flex-1"
          >
            {renderShareButtonIcon(isExporting)}
            {renderShareLabel(t)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            disabled={isExporting || totalSpent === 0}
            aria-label={t('report.saveImage')}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyReportCard;

// ─── Helper render functions ──────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

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

const renderBudgetSection = (
  budgetPercent: number | null,
  monthlyBudget: number | null,
  t: TFunc,
  currency: string,
) => {
  if (budgetPercent === null || monthlyBudget === null) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('report.noBudget')}
      </p>
    );
  }

  const barWidth = Math.min(budgetPercent, 100);
  let barClass = 'bg-primary';
  if (budgetPercent > 100) barClass = 'bg-destructive';
  else if (budgetPercent > 80) barClass = 'bg-amber-500';

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>
          {t('report.budgetUsed', { percent: Math.round(budgetPercent) })}
        </span>
        <span>{formatCurrency(monthlyBudget, currency)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

const renderLastMonthComparison = (lastMonthAmount: number, t: TFunc, currency: string) => {
  if (lastMonthAmount === 0) return null;

  return (
    <p className="text-xs text-muted-foreground mt-2">
      {t('report.vsLastMonth', { amount: formatCurrency(lastMonthAmount, currency) })}
    </p>
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
        {t('report.topCategories')}
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
