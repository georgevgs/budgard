import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const AnalyticsLoadingState = () => (
  <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4 space-y-6">
    {/* This month vs last month */}
    <div className="grid grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>

    <div className="space-y-4">
      {/* Year select */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Total spent / monthly avg */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    </div>

    {/* Chart */}
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-[300px] w-full rounded-md" />
      </CardContent>
    </Card>

    {/* Bottom: month extremes + category breakdown */}
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-3 w-24 mb-1" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-14 shrink-0" />
                <Skeleton className="h-3 w-7 shrink-0" />
              </div>
              <Skeleton className="ml-5 h-1 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AnalyticsLoadingState;
