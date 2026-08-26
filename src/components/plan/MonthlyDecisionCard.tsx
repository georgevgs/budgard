import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import TileLabel from '@/components/bento/TileLabel';
import { formatCurrency } from '@/lib/utils';
import type { MonthlyDecision } from '@/lib/monthlyDecision';

type Props = {
  decision: MonthlyDecision;
  currency: string;
};

const MonthlyDecisionCard = ({ decision, currency }: Props) => {
  const { t } = useTranslation();

  return (
    <section
      className="tile-slab lift mt-6 px-5.5 py-5.5"
      aria-label={t(`plan.decision.label.${decision.state}`)}
      aria-live="polite"
    >
      <TileLabel>{t(`plan.decision.label.${decision.state}`)}</TileLabel>
      {renderFigure(decision, currency, t)}
      <p className="mt-2.5 max-w-[34rem] text-[0.84rem] font-semibold leading-tight opacity-92">
        {decisionBody(decision, currency, t)}
      </p>
      {renderAllocation(decision, currency, t)}
      {renderAction(decision.state, t)}
    </section>
  );
};

export default MonthlyDecisionCard;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderFigure = (
  decision: MonthlyDecision,
  currency: string,
  t: TFunc,
) => {
  if (decision.amount === null) {
    return <p className="mt-3.5 type-figure-xl">{t('plan.decision.start')}</p>;
  }

  return (
    <p className="mt-3.5 type-slab text-[2.75rem] sm:text-[3.5rem]">
      {formatCurrency(decision.amount, currency)}
    </p>
  );
};

const decisionBody = (
  decision: MonthlyDecision,
  currency: string,
  t: TFunc,
): string => {
  return t(`plan.decision.body.${decision.state}`, {
    savings: formatCurrency(decision.savingsReserve, currency),
  });
};

const renderAllocation = (
  decision: MonthlyDecision,
  currency: string,
  t: TFunc,
) => {
  if (decision.state === 'noBudget') {
    return null;
  }

  return (
    <div className="mt-5 grid grid-cols-3 divide-x divide-current/20 border-t border-current/20 pt-4">
      {allocation(t('plan.decision.spent'), decision.spent, currency)}
      {allocation(t('plan.decision.committed'), decision.committed, currency)}
      {allocation(
        t('plan.decision.savings'),
        decision.savingsReserve,
        currency,
      )}
    </div>
  );
};

const allocation = (label: string, amount: number, currency: string) => (
  <div className="min-w-0 px-2 first:pl-0 last:pr-0">
    <TileLabel className="truncate text-[0.65rem] opacity-75">
      {label}
    </TileLabel>
    <p className="mt-1 truncate text-sm font-semibold tabular-nums">
      {formatCurrency(amount, currency)}
    </p>
  </div>
);

const renderAction = (state: MonthlyDecision['state'], t: TFunc) => {
  const className =
    'mt-4 inline-flex items-center gap-1.5 rounded-full bg-current/14 px-3 py-1.5 text-[0.8rem] font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current';

  if (state === 'noBudget') {
    return (
      <a href="#monthly-plan" className={className}>
        {t('plan.decision.action.setBudget')}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    );
  }
  if (state === 'shortfall') {
    return (
      <Link to="/activity" viewTransition className={className}>
        {t('plan.decision.action.review')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }
  if (state === 'save') {
    return (
      <a href="#savings-rhythm" className={className}>
        {t('plan.decision.action.save')}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    );
  }

  return <span className={className}>{t('plan.decision.action.steady')}</span>;
};
