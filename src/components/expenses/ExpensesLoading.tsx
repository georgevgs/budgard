import { Skeleton } from '@/components/ui/skeleton';

// Mirrors the exact structure of the expenses page so the transition
// from skeleton → real content feels seamless rather than jarring.
const ExpenseLoadingState = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-58px)]">
      <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-3">
        {/* Monthly selector */}
        <div className="flex items-center justify-between px-1">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Monthly overview card */}
        <div className="rounded-lg border p-4 space-y-3">
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
    </div>
  );
};

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
        <div key={i} className="rounded-lg border overflow-hidden">
          <div className="flex">
            {/* Category accent strip */}
            <Skeleton className="w-1 rounded-none shrink-0" style={{ height: 64 }} />
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

export default ExpenseLoadingState;
