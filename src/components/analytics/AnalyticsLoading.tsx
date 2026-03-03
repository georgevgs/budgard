import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const AnalyticsLoadingState = () => (
  <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-6">
    {/* Month snapshot */}
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-3 w-44" />
      <div className="pt-4 border-t border-border/50 space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>

    {/* Year selector + chart */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[130px] rounded-md" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[280px] w-full rounded-md" />
        </CardContent>
      </Card>
    </div>

    {/* Category breakdown */}
    <div className="space-y-3">
      <Skeleton className="h-3 w-32" />
      <Card>
        <CardContent className="p-0 divide-y divide-border/50">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-7 w-16 shrink-0" />
              <Skeleton className="h-4 w-14 shrink-0" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AnalyticsLoadingState;
