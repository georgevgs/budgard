import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExpensesData, useIncomesData } from '@/contexts/DataContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import YearPill from '@/components/analytics/YearPill';
import AnnualExportCard from '@/components/analytics/AnnualExportCard';
import ProUpsellCard from '@/components/pro/ProUpsellCard';
import { useOnDemandHistory } from '@/hooks/data/useOnDemandHistory';

// An export utility, not a trend — it used to sit at the bottom of the
// Trends scroll for no reason but proximity. It owns its own year picker
// here since Settings has no shared "selected year" the way Trends does.
//
// Pro-only: useExpensesData/useIncomesData return full history regardless of
// tier (the free-tier 3-month window is applied per-consumer, not in
// DataContext), so this card must gate itself rather than inherit a limit.
const AnnualExportSection = () => {
  const { t } = useTranslation();
  const { isPro } = useSubscription();
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  useOnDemandHistory(isPro);
  const availableYears = useAvailableYears(expenses, incomes);
  const [selectedYear, setSelectedYear] = useState(() => availableYears[0]);

  // Data can still be loading on first mount, when availableYears is empty
  // and the lazy initializer above has nothing to pick — catch up once it
  // arrives, the same adjust-during-render pattern useAnalyticsData uses.
  if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
    setSelectedYear(availableYears[0]);
  }

  if (!isPro) {
    return (
      <ProUpsellCard
        title={t('pro.gate.annualExportTitle')}
        description={t('pro.gate.annualExportBody')}
      />
    );
  }

  if (availableYears.length === 0) {
    return null;
  }

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
};

export default AnnualExportSection;

// --- Helpers ---

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
