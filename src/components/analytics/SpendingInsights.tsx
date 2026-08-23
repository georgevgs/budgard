import { useTranslation } from 'react-i18next';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import InsightIcon from '@/components/common/InsightIcon';
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

  // Lead with the most impactful insight as a hero card
  const [hero, ...rest] = insights;

  return (
    <div className="space-y-3">
      <h2 className="type-heading">
        {t('analytics.insights.sectionTitle')}
      </h2>
      {renderHeroCard(hero)}
      {renderSecondaryCards(rest)}
    </div>
  );
};

export default SpendingInsights;

// ─── Helper render functions ──────────────────────────────────────────────────

// The lead insight is the same panel as the ones under it, told apart by the
// size and weight of its copy rather than by its ground.
//
// It used to be tinted by variant — `bg-income/10` with an `income/20` border,
// or the warning and primary equivalents — which put a mint-green or cream
// wash across the widest card on the screen. That is a hue mixed into a white
// surface, which is the one thing the palette rules out by name: it lands in
// the beige band the app was repainted to get out of. See palette.ts.
const renderHeroCard = (insight: Insight) => {
  return (
    <div
      data-insight="hero"
      className="surface-card flex items-start gap-3.5 p-4"
    >
      <InsightIcon
        variant={insight.variant}
        icon={insight.icon}
        className="mt-0.5 h-5 w-5"
      />
      <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
    </div>
  );
};

const renderSecondaryCards = (insights: Insight[]) => {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-2">
      {insights.map((insight) => {
        const Icon = insight.icon;

        return (
          <div
            key={insight.id}
            data-insight="secondary"
            className="surface-card px-3.5 py-3 flex items-center gap-3"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
};

