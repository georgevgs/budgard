import { Skeleton } from '@/components/ui/skeleton';

export const SkeletonStatCard = () => (
  <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3 shadow-sm">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-9 w-48" />
    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  </div>
);
