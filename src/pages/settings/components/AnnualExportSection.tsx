import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDataActions,
  useDataConfig,
  useExpensesData,
  useIncomesData,
} from '@/common/contexts/DataContext';
import { useSubscription } from '@/common/contexts/SubscriptionContext';
import { YearPill } from '@/common/components/common/YearPill';
import { AnnualExportCard } from '@/pages/settings/components/AnnualExportCard';
import { ProUpsellCard } from '@/common/components/pro/ProUpsellCard';
import { useOnDemandHistory } from '@/common/hooks/data/useOnDemandHistory';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import RetryCard from '@/common/components/common/RetryCard/RetryCard';

export const AnnualExportSection = () => {
  const { t } = useTranslation();
  const { isPro } = useSubscription();
  const { isInitialized, isHistoryLoaded, hasHistoryLoadError } =
    useDataConfig();
  const { loadHistory } = useDataActions();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  useOnDemandHistory(isPro);
  const availableYears = useAvailableYears(expenses, incomes);
  const latestYear = availableYears[0] ?? null;
  const [selectedYear, setSelectedYear] = useState(latestYear);
  if (
    null !== latestYear &&
    (null === selectedYear || false === availableYears.includes(selectedYear))
  ) {
    setSelectedYear(latestYear);
  }

  if (false === isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.annualExportTitle')}
        description={t('pro.gate.annualExportBody')}
      />
    );
  } else if (hasHistoryLoadError) {
    return (
      <RetryCard
        message={t('annualExport.historyLoadFailed')}
        onRetry={loadHistory}
      />
    );
  } else if (false === isInitialized || false === isHistoryLoaded) {
    return (
      <SurfaceCard role="status" className="p-4 text-sm text-muted-foreground">
        {t('annualExport.loadingHistory')}
      </SurfaceCard>
    );
  } else if (null === selectedYear || null === latestYear) {
    return null;
  } else {
    return (
      <AnnualExportCard
        selectedYear={selectedYear}
        action={
          <YearPill
            selectedYear={selectedYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
          />
        }
      />
    );
  }
};

type YearedRow = { date: string };

const useAvailableYears = (
  expenses: YearedRow[],
  incomes: YearedRow[],
): number[] => {
  return useMemo(() => {
    const years = new Set<number>();
    for (const row of expenses) {
      years.add(Number(row.date.slice(0, 4)));
    }
    for (const row of incomes) {
      years.add(Number(row.date.slice(0, 4)));
    }

    return Array.from(years).sort().reverse();
  }, [expenses, incomes]);
};
