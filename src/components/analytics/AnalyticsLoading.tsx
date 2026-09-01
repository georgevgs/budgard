import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

// Shaped like the calm overview: written review, one chart, composition, then
// the route into deeper analysis.
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
  { key: 'review', body: 'h-28 w-full rounded-xl' },
  { key: 'chart', body: 'h-64 w-full rounded-xl' },
  { key: 'breakdown', body: 'h-44 w-full rounded-xl' },
] as const;
