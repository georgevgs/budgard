import { useTranslation } from 'react-i18next';
import { TransactionsSkeletonBody } from '@/common/components/common/TransactionsSkeletonBody';
import { Skeleton } from '@/common/ui/skeleton';
import LoadingScreen from '@/common/ui/loading-screen';

const NAV_TABS = [0, 1, 2, 3];

// Full-page skeleton shown during the auth check phase so users never
// see a spinner — the skeleton is visible from the very first frame.
export const AppLoadingSkeleton = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingApp')}
      className="min-h-dvh bg-background flex flex-col"
    >
      {/* No app bar to stand in for any more: every screen draws its own
          header, and the body below already opens with one. */}
      <main className="flex-1 pb-(--dock-inset)">
        <TransactionsSkeletonBody />
      </main>

      {/* Nav tabs */}
      <div className="fixed inset-x-(--dock-edge) bottom-(--dock-bottom) pr-(--dock-action-slot)">
        <div className="glass-capsule flex h-(--dock-height) items-stretch p-1">
          {NAV_TABS.map((i) => (
            <div
              key={`nav-${i}`}
              className="flex flex-1 flex-col items-center justify-center gap-1"
            >
              <Skeleton className="h-5 w-5 rounded-sm" />
              <Skeleton className="h-2 w-10" />
            </div>
          ))}
        </div>
      </div>
    </LoadingScreen>
  );
};
