import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import LoadingScreen from '@/components/ui/loading-screen';

type Section = 'expenses' | 'income';

type Props = {
  section?: Section;
};

// Full-page skeleton shown during the auth check phase so users never
// see a spinner — the skeleton is visible from the very first frame.
export const AppLoadingSkeleton = () => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingApp')}
      className="min-h-dvh bg-background flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 pt-2 pb-(--dock-inset)">
        {renderTransactionsBody()}
      </main>

      {/* Nav tabs */}
      <div className="fixed inset-x-(--dock-edge) bottom-(--dock-bottom) pr-(--dock-action-slot)">
        <div className="glass-capsule flex h-(--dock-height) items-stretch p-1">
          {[0, 1, 2, 3].map((i) => (
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

// Mirrors the exact structure of the expenses page so the transition
// from skeleton → real content feels seamless rather than jarring.
// Income reuses it — the two lists share a layout — and only differs in
// what gets announced to assistive tech.
export const ExpenseLoadingState = ({ section = 'expenses' }: Props) => {
  const { t } = useTranslation();

  return (
    <LoadingScreen
      label={t('common.loadingSection', {
        section: resolveSectionName(section, t),
      })}
      className="flex flex-col min-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top)-var(--dock-inset))]"
    >
      {renderTransactionsBody()}
    </LoadingScreen>
  );
};

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const resolveSectionName = (section: Section, t: TranslateFunction): string => {
  if (section === 'income') {
    return t('navigation.income');
  }

  return t('navigation.expenses');
};

// Shared by both exports above. Kept announcement-free so AppLoadingSkeleton
// can wrap it in a single live region instead of nesting two.
const renderTransactionsBody = () => (
  <div className="page-shell space-y-3">
    {/* Monthly selector */}
    <div className="flex items-center justify-between px-1">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>

    {/* Monthly overview card */}
    <div className="rounded-2xl border border-border/50 p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-36" />
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-10" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>

    {/* Search bar */}
    <Skeleton className="h-10 w-full rounded-lg" />

    {/* Expense card skeletons — varying widths feel natural */}
    {renderSkeletonCards()}
  </div>
);

const SKELETON_ROWS = [
  { desc: 'w-2/5', badge: 'w-20', amount: 'w-14' },
  { desc: 'w-1/2', badge: 'w-16', amount: 'w-16' },
  { desc: 'w-1/3', badge: 'w-24', amount: 'w-12' },
  { desc: 'w-2/5', badge: 'w-18', amount: 'w-14' },
  { desc: 'w-1/2', badge: 'w-20', amount: 'w-16' },
] as const;

const renderSkeletonCards = () => {
  return (
    <div className="space-y-2 pt-1">
      {SKELETON_ROWS.map((row, i) => (
        <div
          key={`skeleton-${i}`}
          className="rounded-2xl border border-border/50 overflow-hidden"
        >
          <div className="flex">
            {/* Category accent strip */}
            <Skeleton className="w-1 h-16 rounded-none shrink-0" />
            <div className="p-4 flex-1 flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <Skeleton className={`h-4 ${row.desc}`} />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className={`h-5 ${row.amount} shrink-0`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
