import { Skeleton } from '@/components/ui/skeleton';

const ROWS = [
  { name: 'w-2/5', target: 'w-24', bar: 'w-3/5' },
  { name: 'w-1/2', target: 'w-20', bar: 'w-2/5' },
  { name: 'w-1/3', target: 'w-28', bar: 'w-4/5' },
] as const;

const GoalsLoadingState = () => (
  <div className="container max-w-4xl mx-auto p-4 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-9 w-28 rounded-md shrink-0" />
    </div>

    <div className="grid gap-4">
      {ROWS.map((row, i) => (
        <div
          key={`goal-skel-${i}`}
          className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className={`h-4 ${row.name}`} />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className={`h-5 ${row.target}`} />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className={`h-3 ${row.bar}`} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default GoalsLoadingState;
