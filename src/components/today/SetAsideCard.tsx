import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PiggyBank from 'lucide-react/dist/esm/icons/piggy-bank';
import { useSetAside } from '@/hooks/today/useSetAside';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { SavingsRhythm } from '@/hooks/today/useSavingsRhythm';
import type { Goal } from '@/types/Goal';

type Props = {
  rhythm: SavingsRhythm;
  goal: Goal;
  currency: string;
};

const SetAsideCard = ({ rhythm, goal, currency }: Props) => {
  const { t } = useTranslation();
  const setAside = useSetAside();
  const [isSaving, setIsSaving] = useState(false);

  const moveSurplus = () => {
    setIsSaving(true);
    void setAside(goal, rhythm.surplusYesterday)
      .catch(() => undefined)
      .finally(() => setIsSaving(false));
  };

  return (
    <div className="mt-4 border-t border-border/40 pt-4">
      {renderOffer(rhythm, goal, currency, isSaving, moveSurplus, t)}
      {renderTotal(rhythm, currency, t)}
    </div>
  );
};

export default SetAsideCard;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// The offer names yesterday's real surplus and the goal it would land in.
// Hidden once the day's transfer is made, so it can never read as a demand for
// a second one.
const renderOffer = (
  rhythm: SavingsRhythm,
  goal: Goal,
  currency: string,
  isSaving: boolean,
  onMove: () => void,
  t: TFunc,
) => {
  if (rhythm.setAsideToday) {
    return (
      <p className="mb-3 text-sm font-semibold text-primary">
        {t('today.rhythm.setAside.done')}
      </p>
    );
  }
  if (rhythm.surplusYesterday <= 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <p className="mb-2 text-sm leading-relaxed opacity-75">
        {t('today.rhythm.setAside.surplus', {
          amount: formatCurrency(rhythm.surplusYesterday, currency),
        })}
      </p>
      <Button onClick={onMove} disabled={isSaving} className="w-full gap-2">
        <PiggyBank className="h-4 w-4" />
        {t('today.rhythm.setAside.action', { goal: goal.name })}
      </Button>
    </div>
  );
};

const renderTotal = (rhythm: SavingsRhythm, currency: string, t: TFunc) => {
  if (rhythm.setAside <= 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-60">
          {t('today.rhythm.setAside.total')}
        </p>
        <p className="font-display text-lg font-semibold tabular-nums">
          {formatCurrency(rhythm.setAside, currency)}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${rhythm.milestoneProgress}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold opacity-75">
        {t('today.rhythm.setAside.milestone', {
          amount: formatCurrency(rhythm.milestoneRemaining, currency),
          target: formatCurrency(rhythm.milestone, currency),
        })}
      </p>
    </div>
  );
};
