import { Skeleton } from '@/components/ui/skeleton';

const ROWS = [
  { desc: 'w-2/5', badge1: 'w-16', badge2: 'w-20', amount: 'w-16' },
  { desc: 'w-1/2', badge1: 'w-20', badge2: 'w-14', amount: 'w-12' },
  { desc: 'w-1/3', badge1: 'w-18', badge2: 'w-16', amount: 'w-14' },
] as const;

const RecurringLoadingState = () => (
  <div className="container max-w-4xl mx-auto p-4 space-y-4">
    {/* Header */}
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-9 w-32 rounded-md shrink-0" />
    </div>

    {/* Cards */}
    <div className="grid gap-4">
      {ROWS.map((row, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className={`h-4 ${row.desc}`} />
              <div className="flex items-center gap-2">
                <Skeleton className={`h-5 ${row.badge1} rounded-full`} />
                <Skeleton className={`h-5 ${row.badge2} rounded-full`} />
              </div>
              <Skeleton className={`h-5 ${row.amount}`} />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RecurringLoadingState;
