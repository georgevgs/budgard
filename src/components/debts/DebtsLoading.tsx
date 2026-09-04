import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';
import LoadingScreen from '@/components/ui/loading-screen';

const ROWS = ['w-2/5', 'w-1/2', 'w-1/3'] as const;

const DebtsLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSection', { section: t('navigation.debts') })}
      className="page-shell space-y-4"
    >
      <Skeleton className="h-9 w-36" />
      <SkeletonStatCard />

      <div className="space-y-3">
        {ROWS.map((width, i) => (
          <div key={`debts-skel-${i}`} className="surface-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className={`h-4 ${width}`} />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </LoadingScreen>
  );
};

export default DebtsLoadingState;
