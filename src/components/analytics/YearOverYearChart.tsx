import { useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';

const Chart = lazy(() => import('react-apexcharts'));

interface MonthDatum {
  month: string;
  amount: number;
}

interface YearOverYearChartProps {
  currentYearData: MonthDatum[];
  prevYearData: MonthDatum[];
  currentYear: number;
  prevYear: number;
}

const YearOverYearChart = ({
  currentYearData,
  prevYearData,
  currentYear,
  prevYear,
}: YearOverYearChartProps) => {
  const { t } = useTranslation();

  const hasAnyData =
    currentYearData.some((d) => d.amount > 0) ||
    prevYearData.some((d) => d.amount > 0);

  const chartOptions = useMemo(
    () => ({
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        fontFamily: 'inherit',
        background: 'transparent',
        animations: { enabled: true },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '62%',
          borderRadius: 3,
          borderRadiusApplication: 'end' as const,
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: 'hsl(var(--border) / 0.2)',
        strokeDashArray: 4,
      },
      xaxis: {
        categories: currentYearData.map((d) => d.month),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: 'hsl(var(--muted-foreground))' },
        },
      },
      yaxis: {
        labels: {
          formatter: (val: number) => `${Math.round(val)} €`,
          style: { colors: 'hsl(var(--muted-foreground))' },
        },
      },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (val: number) => `${val.toFixed(2)} €`,
        },
      },
      colors: ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'],
      legend: {
        position: 'top' as const,
        horizontalAlign: 'right' as const,
        labels: { colors: 'hsl(var(--foreground))' },
        markers: { size: 8, shape: 'circle' },
      },
    }),
    [currentYearData],
  );

  const chartSeries = useMemo(
    () => [
      {
        name: currentYear.toString(),
        data: currentYearData.map((d) => d.amount),
      },
      {
        name: prevYear.toString(),
        data: prevYearData.map((d) => d.amount),
      },
    ],
    [currentYearData, prevYearData, currentYear, prevYear],
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          {t('analytics.yearOverYear.title')}
        </h3>
        {!hasAnyData ? (
          <div className="h-[260px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {t('analytics.yearOverYear.noData')}
            </p>
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <Suspense
              fallback={
                <div className="h-full w-full flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              }
            >
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height="100%"
              />
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default YearOverYearChart;
