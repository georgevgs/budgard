import { Skeleton } from '@/components/ui/skeleton';

const ROWS = ['w-2/5', 'w-1/2', 'w-1/3'] as const;

const DebtsLoadingState = () => (
  <div className="container max-w-4xl mx-auto p-4 space-y-4">
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

    <div className="space-y-3">
      {ROWS.map((width, i) => (
        <div
          key={`debts-skel-${i}`}
          className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
        >
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
  </div>
);

export default DebtsLoadingState;
