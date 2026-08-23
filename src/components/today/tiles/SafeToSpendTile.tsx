import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';
import { formatCurrency } from '@/lib/utils';
import type { TodayStatus } from '@/hooks/today/useTodayGuidance';

type Props = {
  status: TodayStatus;
  safeToSpend: number | null;
  spentThisMonth: number;
  dailyAllowance: number | null;
  /** What an ordinary day actually costs this person. Null until there is
   *  enough history to say. */
  typicalDay: number | null;
  daysRemaining: number;
  currency: string;
};

// The one number the screen exists to answer, on the one slab of colour in the
// app. Everything else in the grid is a supporting fact about this figure.
const SafeToSpendTile = (props: Props) => {
  const { t } = useTranslation();
  const { whole, fraction } = splitAmount(
    resolveAmount(props),
    props.currency,
  );

  return (
    <BentoTile
      tone="slab"
      wide
      to={resolveDestination(props)}
      ariaLabel={resolveAriaLabel(props, t)}
      className="px-5.5 pt-5.5 pb-5"
    >
      <div className="flex items-center justify-between gap-3">
        {renderLabel(props, t)}
        {renderChip(props, t)}
      </div>
      <p className="mt-3.5 type-slab">
        {whole}
        <span className="type-fraction">{fraction}</span>
      </p>
      {renderCaption(props, t)}
    </BentoTile>
  );
};

export default SafeToSpendTile;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Without a budget there is no "safe to spend", but "what have I spent" is
// still a real answer — and it is the one figure that never needs setting up.
//
// Past the budget the figure is shown as the SIZE of the overspend rather than
// as a negative balance. A minus sign is the entire difference between "you
// have 200" and "you owe 200", and at 3.5rem with the tracking this scale runs
// it is one glyph ahead of a number three characters wide — the easiest thing
// on the screen to miss. The label says which way round it is instead, in
// words, which cannot be missed at a glance the way a hyphen can.
const resolveAmount = (props: Props): number => {
  if (props.safeToSpend === null) {
    return props.spentThisMonth;
  }

  return Math.abs(props.safeToSpend);
};

// Over budget the label is not describing the figure, it IS the reading — so
// it is drawn as a badge rather than as an eyebrow. Everywhere else it stays
// the quiet caption every other tile in the grid uses.
const renderLabel = (props: Props, t: TFunc) => {
  if (isOverBudget(props)) {
    return <span className="tile-badge">{t('today.tiles.overBudget')}</span>;
  }

  return <TileLabel>{resolveLabel(props, t)}</TileLabel>;
};

const isOverBudget = (props: Props): boolean =>
  props.safeToSpend !== null && props.safeToSpend < 0;

const resolveLabel = (props: Props, t: TFunc): string => {
  if (props.safeToSpend === null) {
    return t('today.spentSoFar');
  }

  return t('today.tiles.safeToSpend');
};

// `tight` is reached only when safeToSpend is negative (see resolveStatus),
// which is the one state whose badge already says so, louder. A chip beside it
// would be the same fact twice, and the quieter of the two would win the
// corner — so in that state the badge keeps it and the chip stands down.
const renderChip = (props: Props, t: TFunc) => {
  if (props.status === 'tight') {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-current/14 px-2.5 py-1.5 text-[0.65rem] font-semibold uppercase leading-none tracking-[0.1em]">
      {t(`today.chip.${props.status}`)}
    </span>
  );
};

// Only the no-budget slab is a doorway. Everywhere else the number IS the
// answer, and a tap that navigated away from it would be a tap that took the
// screen's whole point off screen.
const resolveDestination = (props: Props): string | undefined => {
  if (props.safeToSpend === null) {
    return '/plan';
  }

  return undefined;
};

// Only the no-budget state is a link, so it is the only one with a name to
// give. Everywhere else the slab is a div and a label would be dropped.
const resolveAriaLabel = (props: Props, t: TFunc): string | undefined => {
  if (props.safeToSpend === null) {
    return t('today.setBudget');
  }

  return undefined;
};

// The daily allowance is the slab's caption because it is the figure that
// turns a balance into a decision. The other two states each have a different
// next step, and the caption is where it goes:
//   no budget  — there is one thing to do, so say it
//   over plan  — the month cannot be undone, but the days left are still
//                theirs, so quote what an ordinary one of them costs
const renderCaption = (props: Props, t: TFunc) => {
  if (props.safeToSpend === null) {
    return renderCaptionAction(t('today.setBudget'));
  }
  if (props.dailyAllowance === null || props.dailyAllowance <= 0) {
    return renderRecovery(props, t);
  }

  return renderCaptionText(
    t('today.tile.dailyPace', {
      amount: formatCurrency(props.dailyAllowance, props.currency),
      count: props.daysRemaining,
    }),
  );
};

const renderRecovery = (props: Props, t: TFunc) => {
  if (props.typicalDay === null || props.daysRemaining <= 0) {
    return renderCaptionText(t('today.overPlan'));
  }

  return renderCaptionText(
    t('today.recovery', {
      amount: formatCurrency(props.typicalDay, props.currency),
      count: props.daysRemaining,
    }),
  );
};

const renderCaptionText = (text: string) => (
  <p className="mt-2.5 text-[0.84rem] font-semibold leading-tight opacity-92">
    {text}
  </p>
);

const renderCaptionAction = (text: string) => (
  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-current/14 px-3 py-1.5 text-[0.8rem] font-semibold leading-none">
    {text}
    <ArrowRight className="h-3.5 w-3.5" />
  </p>
);

// The cents step back so the euros carry the glance — but only to 72%, not
// the 62% they sat at while the slab label was near-black. White on the orange
// starts at 2.46:1, so every step of transparency costs far more here than it
// did against a dark label, and 62% put the cents under 1.8:1.
//
// Splitting on the last
// separator rather than formatting twice keeps every locale's grouping,
// currency position and decimal mark exactly as Intl produced them.
const splitAmount = (
  amount: number,
  currency: string,
): { whole: string; fraction: string } => {
  const text = formatCurrency(amount, currency);
  const match = /^(.*)([.,]\d{2})(\D*)$/.exec(text);
  if (!match) {
    return { whole: text, fraction: '' };
  }

  return { whole: match[1], fraction: `${match[2]}${match[3]}` };
};
