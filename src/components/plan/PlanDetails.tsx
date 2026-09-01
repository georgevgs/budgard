import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { useTranslation } from 'react-i18next';
import BudgetProgress from '@/components/budget/BudgetProgress';
import FiftyThirtyTwentyRing from '@/components/income/FiftyThirtyTwentyRing';
import SavingsRhythm from '@/components/plan/SavingsRhythm';
import type { useSavingsRhythm } from '@/hooks/savings/useSavingsRhythm';

type Props = {
  isOpen: boolean;
  monthKey: string;
  monthlyBudget: number | null;
  monthlySpent: number;
  currency: string;
  rhythm: ReturnType<typeof useSavingsRhythm>;
  onOpenChange: (isOpen: boolean) => void;
  onBudgetUpdate: (amount: number) => Promise<void>;
};

// Budget controls and explanatory analysis are useful, but they are not the
// plan's first answer. One disclosure keeps both available without stacking
// two more dashboards into every visit.
const PlanDetails = (props: Props) => {
  const { t } = useTranslation();

  return (
    <details
      id="monthly-details"
      open={props.isOpen}
      onToggle={(event) => props.onOpenChange(event.currentTarget.open)}
      className="group mt-8 scroll-mt-6"
    >
      <summary className="surface-card flex cursor-pointer list-none items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block type-heading">{t('plan.context.title')}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            {t('plan.context.description')}
          </span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-6 space-y-8">
        <section
          className="surface-card p-5"
          aria-labelledby="monthly-plan-title"
        >
          <h2 id="monthly-plan-title" className="mb-4 type-heading">
            {t('plan.monthlyPlan')}
          </h2>
          <BudgetProgress
            monthlyBudget={props.monthlyBudget}
            monthlySpent={props.monthlySpent}
            onBudgetUpdate={props.onBudgetUpdate}
            currencyCode={props.currency}
          />
        </section>
        <FiftyThirtyTwentyRing selectedMonth={props.monthKey} />
        <SavingsRhythm rhythm={props.rhythm} currency={props.currency} />
      </div>
    </details>
  );
};

export default PlanDetails;
