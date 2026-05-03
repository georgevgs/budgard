import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';

const ROWS = ['w-2/5', 'w-1/2', 'w-1/3'] as const;

const NetWorthLoadingState = () => (
  <div className="container max-w-4xl mx-auto p-4 space-y-4">
    <SkeletonStatCard />

    <div className="space-y-4">
      {ROWS.map((width, i) => (
        <div
          key={`networth-skel-${i}`}
          className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3"
        >
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export default NetWorthLoadingState;
