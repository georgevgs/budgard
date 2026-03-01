import { useTranslation } from 'react-i18next';
import type { Locale } from 'date-fns';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import {
  useSpendingInsights,
  type Insight,
} from '@/hooks/useSpendingInsights';

interface SpendingInsightsProps {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  monthlyData: { month: string; fullMonth: string; amount: number }[];
  categories: Category[];
  dateLocale: Locale;
}

const SpendingInsights = (props: SpendingInsightsProps) => {
  const { t } = useTranslation();
  const insights = useSpendingInsights(props);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('analytics.insights.sectionTitle')}
      </p>
      {insights.map((insight) => renderInsightCard(insight))}
    </div>
  );
};

export default SpendingInsights;

function renderInsightCard(insight: Insight) {
  const Icon = insight.icon;

  const iconClass =
    insight.variant === 'warning'
      ? 'text-amber-500'
      : insight.variant === 'positive'
        ? 'text-green-500'
        : 'text-primary';

  return (
    <div
      key={insight.id}
      className="rounded-lg border bg-card p-3 flex items-center gap-3"
    >
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
      <p className="text-sm">{insight.text}</p>
    </div>
  );
}
