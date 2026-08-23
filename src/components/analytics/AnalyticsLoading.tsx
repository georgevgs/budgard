import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

// Shaped like the screen it is about to become: a header with the year pill,
// the five-tile bento grid, then the sections of charts under it.
//
// It used to draw the Trends that existed before the bento redesign — a month
// snapshot card, a year selector, a category list — so the skeleton and the
// content it resolved into had no layout in common and everything appeared to
// jump on arrival. A skeleton mirroring a screen the app no longer has costs
// more than no skeleton at all.
const AnalyticsLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSection', { section: t('navigation.analytics') })}
      className="page-shell"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>

      {/* TrendsBento: one wide tile, then two-up, then a wide legend. */}
      <div className="bento mt-4">
        <Skeleton className="bento-wide h-38 rounded-[1.625rem]" />
        <Skeleton className="h-30 rounded-[1.625rem]" />
        <Skeleton className="h-30 rounded-[1.625rem]" />
        <Skeleton className="bento-wide h-44 rounded-[1.625rem]" />
        <Skeleton className="bento-wide h-26 rounded-[1.625rem]" />
      </div>

      {/* TrendsSections: a heading over a panel, twice. */}
      {SECTIONS.map((section) => (
        <div key={section.key} className="mt-8 space-y-3">
          <Skeleton className="h-4 w-36" />
          <div className="surface-card p-5">
            <Skeleton className={section.body} />
          </div>
        </div>
      ))}
    </LoadingScreen>
  );
};

export default AnalyticsLoadingState;

// --- Helpers ---

const SECTIONS = [
  { key: 'chart', body: 'h-56 w-full rounded-xl' },
  { key: 'breakdown', body: 'h-40 w-full rounded-xl' },
] as const;
