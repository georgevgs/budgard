import { useTranslation } from 'react-i18next';
import { useNoSpendOps } from '@/hooks/dataOps/useNoSpendOps';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import RhythmDots from '@/components/today/RhythmDots';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { SavingsRhythm as Rhythm } from '@/hooks/today/useSavingsRhythm';

type Props = {
  rhythm: Rhythm | null;
  currency: string;
};

const SavingsRhythm = ({ rhythm, currency }: Props) => {
  const { t } = useTranslation();
  const { handleNoSpendClaim, handleNoSpendUndo } = useNoSpendOps();
  const bankedDisplay = useAnimatedNumber(rhythm?.banked ?? 0);

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
      <div className="surface-card space-y-4 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] opacity-60">
            {t('today.rhythm.bankedLabel')}
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {formatCurrency(bankedDisplay, currency)}
          </p>
        </div>
        {renderTargetBar(rhythm, currency, t)}
        <RhythmDots days={rhythm.days} />
        {renderClaim(rhythm, claimToday, undoToday, t)}
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

// Without a previous month there is nothing honest to aim at, so the bar drops
// out rather than inventing a target for a first-time user to chase.
const renderTargetBar = (rhythm: Rhythm, currency: string, t: TFunc) => {
  if (rhythm.progress === null) {
    return null;
  }

  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${rhythm.progress}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-semibold opacity-75">
        {renderTargetLabel(rhythm, currency, t)}
      </p>
    </div>
  );
};

const renderTargetLabel = (rhythm: Rhythm, currency: string, t: TFunc) => {
  if (rhythm.remainingToTarget === null || rhythm.remainingToTarget <= 0) {
    return t('today.rhythm.targetBeaten');
  }

  return t('today.rhythm.targetRemaining', {
    amount: formatCurrency(rhythm.remainingToTarget, currency),
  });
};

// Offered only on a day with nothing logged. It is the one action that can
// bank a full allowance, which is why it has to be claimed rather than assumed.
// Claiming is one tap, so undoing has to be one tap too — a banked day the user
// cannot take back is a lie the meter is then stuck with.
const renderClaim = (
  rhythm: Rhythm,
  onClaim: () => void,
  onUndo: () => void,
  t: TFunc,
) => {
  if (rhythm.todayClaimed) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary">
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
    <Button onClick={onClaim} variant="secondary" className="w-full">
      {t('today.rhythm.claim')}
    </Button>
  );
};
