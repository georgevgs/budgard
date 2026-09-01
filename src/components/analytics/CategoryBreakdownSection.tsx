import { useTranslation } from 'react-i18next';
import CategorySparkline from '@/components/analytics/CategorySparkline';
import CategoryIcon from '@/components/common/CategoryIcon';
import { formatCurrency } from '@/lib/utils';
import { getColorTint } from '@/lib/categoryColor';
import type { CategoryRow } from '@/hooks/analytics/useAnalyticsData';

type Props = {
  breakdown: CategoryRow[];
  totalSpent: number;
  selectedYear: number;
  currency: string;
  onCategoryClick: (category: CategoryRow) => void;
};

const CategoryBreakdownSection = (props: Props) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-3" aria-labelledby="category-breakdown-title">
      <h2 id="category-breakdown-title" className="type-heading">
        {t('analytics.categoryTrends')}
      </h2>
      {renderBreakdown(props, t)}
    </section>
  );
};

export default CategoryBreakdownSection;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderBreakdown = (props: Props, t: TFunc) => {
  if (props.breakdown.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t('analytics.noCategorizedExpenses', { year: props.selectedYear })}
      </p>
    );
  }

  return (
    <div className="tile overflow-hidden">
      <div className="divide-y divide-border/40 p-0">
        {props.breakdown.map((category) =>
          renderCategoryRow(category, props, t),
        )}
      </div>
    </div>
  );
};

const renderCategoryRow = (category: CategoryRow, props: Props, t: TFunc) => {
  let percentage = 0;
  if (props.totalSpent > 0) {
    percentage = (category.amount / props.totalSpent) * 100;
  }

  return (
    <button
      key={category.id}
      type="button"
      onClick={() => props.onCategoryClick(category)}
      aria-label={t('analytics.viewCategory', { category: category.name })}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 active:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4 sm:px-5"
    >
      {renderCategoryIcon(category)}
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {category.name}
      </span>
      <div className="hidden w-16 shrink-0 sm:block">
        <CategorySparkline
          values={category.monthlyAmounts}
          color={category.color}
        />
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(category.amount, props.currency)}
      </span>
      <span className="hidden w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
        {Math.round(percentage)}%
      </span>
    </button>
  );
};

const renderCategoryIcon = (category: CategoryRow) => (
  <span
    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
    style={{ backgroundColor: getColorTint(category.color) }}
  >
    <CategoryIcon
      icon={category.icon}
      className="h-3.5 w-3.5 text-foreground/75"
    />
  </span>
);
