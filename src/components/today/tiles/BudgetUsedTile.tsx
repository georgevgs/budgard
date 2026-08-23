import { useTranslation } from 'react-i18next';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { formatCurrency } from '@/lib/utils';

type Props = {
  spentThisMonth: number;
  monthlyBudget: number | null;
  currency: string;
};

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// How much of the plan is gone, as one ring. A bar would have to be read
// against its own ends; a ring at this size is a shape you recognise before
// you read the number in it.
//
// The percentage is HTML laid over the ring rather than an SVG `<text>`. A
// `<text>` is positioned by its BASELINE, so centring it means guessing the
// display face's cap height — the old `y="47"` guessed low and left the number
// sitting a few pixels above the middle of the circle. Flex centring a span
// over the square is exact and stays exact if the face or the size changes.
const BudgetUsedTile = ({ spentThisMonth, monthlyBudget, currency }: Props) => {
  const { t } = useTranslation();
  const percent = resolvePercent(spentThisMonth, monthlyBudget);

  return (
    <BentoTile
      to="/plan"
      ariaLabel={resolveAriaLabel(spentThisMonth, monthlyBudget, t)}
      className="flex flex-col p-4"
    >
      <TileLabel>{t('today.tiles.budgetUsed')}</TileLabel>
      <div
        className="relative mt-3 flex flex-1 items-center justify-center"
        aria-hidden="true"
      >
        <svg viewBox="0 0 84 84" className="h-21 w-21">
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            className="stroke-border/60"
            strokeWidth="9"
          />
          <circle
            cx="42"
            cy="42"
            r={RADIUS}
            fill="none"
            className="stroke-primary"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 42 42)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center type-figure-sm">
          {percent}%
        </span>
      </div>
      <p className="mt-3 text-[0.72rem] leading-snug text-muted-foreground">
        {renderCaption(spentThisMonth, monthlyBudget, currency, t)}
      </p>
    </BentoTile>
  );
};

export default BudgetUsedTile;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Past 100% the ring stops growing — it has run out of circle, and a second
// lap would read as a smaller number than the first. The caption still tells
// the truth about the amounts.
const resolvePercent = (spent: number, budget: number | null): number => {
  if (budget === null || budget <= 0) {
    return 0;
  }

  return Math.min(Math.round((spent / budget) * 100), 100);
};

// The ring reads 0% with no budget, which is true of the ring and false of
// the user — the caption says "no budget set yet", and the accessible name has
// to say the same thing rather than announce a percentage of nothing.
//
// It quotes the TRUE percentage, not the ring's clamped one: someone relying
// on it should hear "130 percent", which is the whole point of asking.
const resolveAriaLabel = (
  spent: number,
  budget: number | null,
  t: TFunc,
): string => {
  if (budget === null || budget <= 0) {
    return t('today.tile.noBudgetYet');
  }

  return t('today.tile.budgetUsedAria', {
    percent: Math.round((spent / budget) * 100),
  });
};

const renderCaption = (
  spent: number,
  budget: number | null,
  currency: string,
  t: TFunc,
): string => {
  if (budget === null || budget <= 0) {
    return t('today.tile.noBudgetYet');
  }

  return t('today.tile.spentOfBudget', {
    spent: formatCurrency(spent, currency),
    budget: formatCurrency(budget, currency),
  });
};
