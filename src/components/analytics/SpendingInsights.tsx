import { useTranslation } from 'react-i18next';
import InsightIcon from '@/components/common/InsightIcon';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import { useSpendingInsights, type Insight } from '@/hooks/useSpendingInsights';

type SpendingInsightsProps = {
  expenses: Expense[];
  monthlyBudget: number | null;
  monthComparison: { thisMonthAmount: number; lastMonthAmount: number };
  categories: Category[];
  defaultCurrency: string;
};

const SpendingInsights = (props: SpendingInsightsProps) => {
  const { t } = useTranslation();
  const insights = useSpendingInsights(props);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="type-heading">{t('analytics.insights.sectionTitle')}</h2>
      {renderInsightList(insights)}
    </div>
  );
};

export default SpendingInsights;

// ─── Helper render functions ──────────────────────────────────────────────────

// Insights are one reading task, so they share one common region instead of
// repeating the same large capsule for every sentence. Ordering carries
// priority; ink and weight stay equal throughout the list.
const renderInsightList = (insights: Insight[]) => {
  return (
    <div data-insight-list className="surface-card card-enter overflow-hidden">
      <div className="divide-y divide-border/40">
        {insights.map((insight) => renderInsightRow(insight))}
      </div>
    </div>
  );
};

const renderInsightRow = (insight: Insight) => {
  return (
    <div
      key={insight.id}
      data-insight="row"
      className="flex min-h-14 items-center gap-3.5 px-4 py-3.5"
    >
      <InsightIcon icon={insight.icon} className="h-4 w-4" />
      <p className="text-sm leading-relaxed text-foreground">{insight.text}</p>
    </div>
  );
};
