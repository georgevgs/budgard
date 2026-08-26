import { useTranslation } from 'react-i18next';
import BentoGrid from '@/components/bento/BentoGrid';
import BudgetUsedTile from '@/components/today/tiles/BudgetUsedTile';
import DebtsTile from '@/components/today/tiles/DebtsTile';
import InsightTile from '@/components/today/tiles/InsightTile';
import MonthPaceTile from '@/components/today/tiles/MonthPaceTile';
import NetWorthTile from '@/components/today/tiles/NetWorthTile';
import RecentActivityTile from '@/components/today/tiles/RecentActivityTile';
import SafeToSpendTile from '@/components/today/tiles/SafeToSpendTile';
import TopCategoryTile from '@/components/today/tiles/TopCategoryTile';
import UpcomingTile from '@/components/today/tiles/UpcomingTile';
import WeeklyRecapTile from '@/components/today/tiles/WeeklyRecapTile';
import type { DailyPace } from '@/hooks/today/useDailyPace';
import type { TopCategory } from '@/hooks/today/useTopCategory';
import type { useTodayGuidance } from '@/hooks/today/useTodayGuidance';
import type { Insight } from '@/hooks/useSpendingInsights';
import type { TodayTileId } from '@/lib/bentoLayout';

type TodayGridProps = {
  visible: TodayTileId[];
  guidance: ReturnType<typeof useTodayGuidance>;
  pace: DailyPace;
  topCategory: TopCategory | null;
  monthlyBudget: number | null;
  onArrange: () => void;
};

// The user's own arrangement, drawn. Order is theirs; which tiles exist at all
// is still ours, and a tile that has nothing to say returns null and gives its
// cell back rather than sitting there empty.
const TodayGrid = (props: TodayGridProps) => {
  if (props.visible.length === 0) {
    return <EmptyGrid onArrange={props.onArrange} />;
  }

  return (
    <BentoGrid className="mt-4">
      {props.visible.map((id) => renderTile(id, props))}
    </BentoGrid>
  );
};

export default TodayGrid;

// --- Helpers ---

// Every module can be hidden, which means all of them can be — ten taps in
// Arrange and this is the screen. The way back has to be on it: the header's
// Arrange button is still there, but a blank page does not tell anyone that.
const EmptyGrid = ({ onArrange }: { onArrange: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="tile-ghost mt-4 px-5 py-10 text-center" role="status">
      <p className="type-heading">{t('today.arrange.emptyTitle')}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {t('today.arrange.emptyBody')}
      </p>
      <button
        type="button"
        onClick={onArrange}
        className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t('today.arrange.open')}
      </button>
    </div>
  );
};

// The slab already answers "how much a day is left", in bigger type and with
// the authority of being the screen's headline. An insight tile repeating it
// spends the grid's one observation slot saying the same thing twice, so the
// daily-allowance insight is skipped here — and only here; Trends still shows
// it, where there is no slab above it.
const DUPLICATES_SLAB = 'dailyBudgetRemaining';

const pickInsight = (insights: Insight[]): Insight | null => {
  const fresh = insights.find((insight) => insight.id !== DUPLICATES_SLAB);

  return fresh ?? null;
};

const renderTile = (id: TodayTileId, props: TodayGridProps) => {
  const { guidance } = props;

  if (id === 'safeToSpend') {
    return (
      <SafeToSpendTile
        key={id}
        status={guidance.status}
        safeToSpend={guidance.safeToSpend}
        spentThisMonth={guidance.spentThisMonth}
        dailyAllowance={guidance.dailyAllowance}
        typicalDay={guidance.typicalDay}
        daysRemaining={guidance.daysRemaining}
        currency={guidance.currency}
      />
    );
  }
  if (id === 'budgetUsed') {
    return (
      <BudgetUsedTile
        key={id}
        spentThisMonth={guidance.spentThisMonth}
        monthlyBudget={props.monthlyBudget}
        currency={guidance.currency}
      />
    );
  }
  if (id === 'monthPace') {
    return <MonthPaceTile key={id} pace={props.pace} />;
  }
  if (id === 'upcoming') {
    return (
      <UpcomingTile
        key={id}
        upcoming={guidance.upcomingWeek}
        currency={guidance.currency}
      />
    );
  }
  if (id === 'topCategory') {
    return (
      <TopCategoryTile
        key={id}
        category={props.topCategory}
        currency={guidance.currency}
      />
    );
  }
  if (id === 'insight') {
    return <InsightTile key={id} insight={pickInsight(guidance.insights)} />;
  }
  if (id === 'recentActivity') {
    return (
      <RecentActivityTile
        key={id}
        items={guidance.recentActivity}
        currency={guidance.currency}
      />
    );
  }
  if (id === 'weeklyRecap') {
    return <WeeklyRecapTile key={id} />;
  }
  if (id === 'netWorth') {
    return <NetWorthTile key={id} />;
  }
  if (id === 'debts') {
    return <DebtsTile key={id} />;
  }

  return renderUnhandled(id);
};

// `id` is narrowed to `never` by the branches above, so adding a tile to
// TODAY_TILES without a branch here stops compiling — rather than quietly
// rendering the last tile in the chain under someone else's label.
const renderUnhandled = (id: never): null => {
  void id;

  return null;
};
