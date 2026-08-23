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
      {/* No app bar to stand in for any more: every screen draws its own
          header, and the body below already opens with one. */}
      <main className="flex-1 pb-(--dock-inset)">
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

// Mirrors the structure of the screen it is about to become so the transition
// from skeleton → real content feels seamless rather than jarring. Income and
// Activity reuse it — they share a layout — and differ only in what gets
// announced to assistive tech.
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

const PILL_ROWS = ['a', 'b', 'c'] as const;

// Shared by both exports above. Kept announcement-free so AppLoadingSkeleton
// can wrap it in a single live region instead of nesting two.
//
// Shaped like the bento grid it becomes: a header, the slab, the two-up
// modules under it, then a stack of row pills. A skeleton mirroring a layout
// the app no longer has costs more than no skeleton at all — the content
// appears to jump the moment it arrives.
const renderTransactionsBody = () => (
  <div className="page-shell">
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>

    <div className="bento mt-4">
      <Skeleton className="bento-wide h-38 rounded-[1.875rem]" />
      <Skeleton className="h-44 rounded-[1.625rem]" />
      <Skeleton className="h-44 rounded-[1.625rem]" />
      <Skeleton className="bento-wide h-30 rounded-[1.625rem]" />
      <Skeleton className="h-26 rounded-[1.625rem]" />
      <Skeleton className="h-26 rounded-[1.625rem]" />
    </div>

    <div className="mt-6 space-y-2">
      {PILL_ROWS.map((row) => (
        <Skeleton key={row} className="h-15 rounded-[1.375rem]" />
      ))}
    </div>
  </div>
);
