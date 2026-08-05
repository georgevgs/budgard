import { useTranslation } from 'react-i18next';
import type { ProPlansDisplay } from '@/hooks/pro/useProPlans';
import { yearlySavingsPercent } from '@/lib/proPlans';
import type { CheckoutPlan } from '@/services/subscriptionService';
import { cn } from '@/lib/utils';

type Props = {
  plan: CheckoutPlan;
  onSelect: (plan: CheckoutPlan) => void;
  plans: ProPlansDisplay;
};

// Stacked selectable plan cards, yearly first with its savings badge —
// the price a card shows is always the per-month figure so the two plans
// stay directly comparable.
const PaywallPlans = ({ plan, onSelect, plans }: Props) => {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('pro.choosePlan')}
      className="space-y-2.5"
    >
      {renderPlanCard({
        value: 'yearly',
        isSelected: plan === 'yearly',
        onSelect,
        name: t('pro.yearly'),
        priceLabel: plans.yearlyPerMonthLabel,
        perLabel: t('pro.perMonth'),
        badge: buildSavingsBadge(plans, t),
        subLine: t('pro.billedYearly', { price: plans.yearlyLabel }),
      })}
      {renderPlanCard({
        value: 'monthly',
        isSelected: plan === 'monthly',
        onSelect,
        name: t('pro.monthly'),
        priceLabel: plans.monthlyLabel,
        perLabel: t('pro.perMonth'),
        badge: null,
        subLine: null,
      })}
    </div>
  );
};

export default PaywallPlans;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type PlanCard = {
  value: CheckoutPlan;
  isSelected: boolean;
  onSelect: (plan: CheckoutPlan) => void;
  name: string;
  priceLabel: string;
  perLabel: string;
  badge: string | null;
  subLine: string | null;
};

const buildSavingsBadge = (plans: ProPlansDisplay, t: TFunc): string | null => {
  const percent = yearlySavingsPercent(plans.prices);
  if (percent <= 0) return null;

  return t('pro.savePercent', { percent });
};

const renderPlanCard = (card: PlanCard) => (
  <label key={card.value} className={getPlanCardClass(card.isSelected)}>
    <input
      type="radio"
      name="upgrade-plan"
      value={card.value}
      checked={card.isSelected}
      onChange={() => card.onSelect(card.value)}
      className="sr-only"
    />
    <span className="flex items-center gap-3">
      {renderRadioDot(card.isSelected)}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{card.name}</span>
          {renderBadge(card.badge)}
        </span>
        {renderSubLine(card.subLine)}
      </span>
      <span className="shrink-0 text-right">
        <span className="text-lg font-bold tabular-nums tracking-tight">
          {card.priceLabel}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {card.perLabel}
        </span>
      </span>
    </span>
  </label>
);

const getPlanCardClass = (isSelected: boolean): string => {
  const base = cn(
    'block w-full cursor-pointer rounded-2xl border p-4 text-left transition-colors',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
  );
  if (isSelected) {
    return cn(base, 'border-primary bg-primary/5 ring-1 ring-primary');
  }

  return cn(base, 'border-border/60 hover:border-border');
};

const renderRadioDot = (isSelected: boolean) => {
  if (isSelected) {
    return (
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary"
      >
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/40"
    />
  );
};

const renderBadge = (badge: string | null) => {
  if (!badge) return null;

  return (
    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
      {badge}
    </span>
  );
};

const renderSubLine = (subLine: string | null) => {
  if (!subLine) return null;

  return (
    <span className="mt-0.5 block text-xs tabular-nums text-muted-foreground">
      {subLine}
    </span>
  );
};
