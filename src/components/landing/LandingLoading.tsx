import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

// Shown for the brief auth check on "/" — the answer decides between the
// marketing page and a redirect to /expenses, so neither can be painted yet.
// Mirrors the landing header + hero so whichever way it resolves, the frame
// the visitor is already looking at stays put.
const LandingLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingApp')}
      className="min-h-dvh bg-background"
    >
      <div className="landing-header">
        <div className="landing-gutter mx-auto flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>

      <div className="landing-gutter mx-auto max-w-3xl pt-20 text-center sm:pt-28">
        <div className="space-y-3">
          <Skeleton className="h-10 sm:h-12 w-4/5 mx-auto" />
          <Skeleton className="h-10 sm:h-12 w-3/5 mx-auto" />
        </div>

        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-2/3 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Skeleton className="h-11 w-36 rounded-lg" />
          <Skeleton className="h-11 w-32 rounded-lg" />
        </div>
      </div>
    </LoadingScreen>
  );
};

export default LandingLoadingState;
