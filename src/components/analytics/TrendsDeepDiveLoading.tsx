import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

const TrendsDeepDiveLoadingState = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSection', { section: t('navigation.analytics') })}
      className="page-shell"
    >
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="bento mt-4">
        <Skeleton className="bento-wide h-38 rounded-[1.625rem]" />
        <Skeleton className="h-30 rounded-[1.625rem]" />
        <Skeleton className="h-30 rounded-[1.625rem]" />
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-4 w-36" />
        <div className="surface-card p-5">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </LoadingScreen>
  );
};

export default TrendsDeepDiveLoadingState;
