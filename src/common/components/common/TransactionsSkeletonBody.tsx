import { Skeleton } from '@/common/ui/skeleton';

const PILL_ROWS = ['a', 'b', 'c'] as const;

// Shared by AppLoadingSkeleton and TransactionsLoading. Kept announcement-free
// so each caller can wrap it in a single live region instead of nesting two.
//
// Shaped like the bento grid it becomes: a header, the slab, the two-up
// modules under it, then a stack of row pills. A skeleton mirroring a layout
// the app no longer has costs more than no skeleton at all — the content
// appears to jump the moment it arrives.
export const TransactionsSkeletonBody = () => (
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
