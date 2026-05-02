import { useTranslation } from 'react-i18next';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';

const WARNING_THRESHOLD = 80;
const EXCEEDED_THRESHOLD = 100;

export type BudgetCategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  cap: number;
  spent: number;
  percent: number;
  remaining: number;
  isOver: boolean;
  isWarning: boolean;
};

type Props = {
  totalCategoryCount: number;
  rows: BudgetCategoryRow[];
  currency: string;
  onManage: () => void;
};

const BudgetCategorySection = ({
  totalCategoryCount,
  rows,
  currency,
  onManage,
}: Props) => {
  const { t } = useTranslation();

  if (totalCategoryCount === 0) return null;

  return (
    <div className="pt-3 mt-1 border-t border-border/50 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('budget.categoryBudgets.sectionTitle')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onManage}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
          {pickManageLabel(rows.length, t)}
        </Button>
      </div>

      {renderRowsOrEmpty(rows, currency, onManage, t)}
    </div>
  );
};

export default BudgetCategorySection;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const pickManageLabel = (rowCount: number, t: TFunc) => {
  if (rowCount === 0) return t('budget.categoryBudgets.add');

  return t('budget.categoryBudgets.manage');
};

const pickBarColor = (isOver: boolean, isWarning: boolean) => {
  if (isOver) return 'bg-destructive';
  if (isWarning) return 'bg-amber-500';

  return 'bg-primary';
};

const renderRowsOrEmpty = (
  rows: BudgetCategoryRow[],
  currency: string,
  onManage: () => void,
  t: TFunc,
) => {
  if (rows.length === 0) {
    return (
      <button
        type="button"
        onClick={onManage}
        className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1.5 px-0.5 transition-colors"
      >
        {t('budget.categoryBudgets.emptyHint')}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => renderRow(row, currency, t))}
    </div>
  );
};

const renderRow = (row: BudgetCategoryRow, currency: string, t: TFunc) => {
  const barWidth = Math.min(row.percent, 100);
  const barColor = pickBarColor(row.isOver, row.isWarning);

  return (
    <div key={row.id} className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        {renderIndicator(row)}
        <span className="flex-1 font-medium truncate min-w-0">{row.name}</span>
        <span
          className={cn(
            'tabular-nums shrink-0',
            row.isOver && 'text-destructive font-medium',
            row.isWarning && 'text-amber-600 dark:text-amber-500 font-medium',
          )}
        >
          {formatCurrency(row.spent, currency)}
          <span className="text-muted-foreground">
            {' '}
            / {formatCurrency(row.cap, currency)}
          </span>
        </span>
      </div>
      <div
        className="h-1.5 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(row.percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('budget.categoryBudgets.progressAria', {
          category: row.name,
          percent: Math.round(row.percent),
        })}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

const renderIndicator = (row: BudgetCategoryRow) => {
  if (row.icon) {
    return (
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0"
        style={{ backgroundColor: `${row.color}20` }}
        aria-hidden="true"
      >
        {row.icon}
      </span>
    );
  }

  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: row.color }}
      aria-hidden="true"
    />
  );
};

export { WARNING_THRESHOLD, EXCEEDED_THRESHOLD };
