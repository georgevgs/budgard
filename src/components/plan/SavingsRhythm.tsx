import { useTranslation } from 'react-i18next';
import { useNoSpendOps } from '@/hooks/dataOps/useNoSpendOps';
import { useIsPro } from '@/hooks/useIsPro';
import { useSetAsideGoal } from '@/hooks/savings/useSavingsRhythm';
import RhythmDots from '@/components/plan/RhythmDots';
import SetAsideCard from '@/components/plan/SetAsideCard';
import { Button } from '@/components/ui/button';
import type { SavingsRhythm as Rhythm } from '@/hooks/savings/useSavingsRhythm';
import type { Goal } from '@/types/Goal';

type Props = {
  rhythm: Rhythm | null;
  currency: string;
};

const SavingsRhythm = ({ rhythm, currency }: Props) => {
  const { t } = useTranslation();
  const { handleNoSpendClaim, handleNoSpendUndo } = useNoSpendOps();
  const isPro = useIsPro();
  const goal = useSetAsideGoal();

  // No budget means no allowance, so there is nothing to score a day against.
  if (!rhythm) {
    return null;
  }

  const claimToday = () => {
    void handleNoSpendClaim(todayKey()).catch(() => undefined);
  };

  const undoToday = () => {
    void handleNoSpendUndo(todayKey()).catch(() => undefined);
  };

  return (
    <section aria-labelledby="savings-rhythm-title">
      <h2
        id="savings-rhythm-title"
        className="mb-3 font-display text-xl font-semibold"
      >
        {t(`today.rhythm.tone.${rhythm.tone}`)}
      </h2>
      <div className="surface-card px-4 py-4">
        <RhythmDots days={rhythm.days} />
        {/* Days, not euros. Nothing moved when a day went well, and a currency
            figure for money that never moved is one the user cannot spend,
            withdraw or reconcile against anything. */}
        <p className="mt-3 text-sm leading-relaxed opacity-75">
          {t('today.rhythm.daysSummary', {
            good: rhythm.goodDays,
            total: rhythm.windowDays,
          })}
        </p>
        {renderClaim(rhythm, claimToday, undoToday, t)}
        {renderSetAside(rhythm, isPro, goal, currency)}
      </div>
    </section>
  );
};

export default SavingsRhythm;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const todayKey = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
};

// Real transfers are Pro, and need a savings-category goal to land in. Without
// either the card stays the honest day-counted version, rather than dangling an
// action that cannot complete.
const renderSetAside = (
  rhythm: Rhythm,
  isPro: boolean,
  goal: Goal | null,
  currency: string,
) => {
  if (!isPro) {
    return null;
  }
  if (!goal) {
    return null;
  }

  return <SetAsideCard rhythm={rhythm} goal={goal} currency={currency} />;
};

// Offered only on a day with nothing logged. It is the one action that turns an
// empty day into a scored one, which is why it has to be claimed rather than
// assumed. Claiming is one tap, so undoing is one tap.
const renderClaim = (
  rhythm: Rhythm,
  onClaim: () => void,
  onUndo: () => void,
  t: TFunc,
) => {
  if (rhythm.todayClaimed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary-ink">
          {t('today.rhythm.claimed')}
        </p>
        <Button onClick={onUndo} variant="ghost" size="sm">
          {t('today.rhythm.undo')}
        </Button>
      </div>
    );
  }
  if (!rhythm.canClaimToday) {
    return null;
  }

  return (
    <Button onClick={onClaim} variant="secondary" className="mt-3 w-full">
      {t('today.rhythm.claim')}
    </Button>
  );
};
