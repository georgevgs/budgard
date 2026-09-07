import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/common/ui/button';
import { Dialog, DialogContent } from '@/common/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useDebts } from '@/common/hooks/useDebts';
import { useDebtPayoffPlan } from '@/pages/debts/hooks/useDebtPayoffPlan';
import type { Debt } from '@/types/Debt';
import type { DebtSummary } from '@/common/hooks/useDebts';
import type { SimResult } from '@/pages/debts/utils/debtPayoff';
import { PageHeader } from '@/common/components/common/PageHeader';
import { DebtsHeader } from '@/pages/debts/components/DebtsHeader';
import { DebtsEmpty } from '@/pages/debts/components/DebtsEmpty';
import { DebtsLoading } from '@/pages/debts/components/DebtsLoading';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { DebtCard } from '@/pages/debts/components/DebtCard';
import { DebtPayoffPlanner } from '@/pages/debts/components/DebtPayoffPlanner';
import { DebtForm } from '@/pages/debts/components/DebtForm';
import { DebtDetailSheet } from '@/pages/debts/components/DebtDetailSheet';
import type { TranslateFunction } from '@/constants/translate';

const DebtsView = () => {
  const { t } = useTranslation();
  const { defaultCurrency, isInitialized, isSecondaryLoaded } = useDataConfig();
  const { debts, summary } = useDebts();
  const { avalanche } = useDebtPayoffPlan(debts, 0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>();
  const [detailDebt, setDetailDebt] = useState<Debt | undefined>();

  const sortedDebts = useMemo(() => sortDebts(debts), [debts]);

  const handleAddClick = useCallback(() => {
    setSelectedDebt(undefined);
    setIsFormOpen(true);
  }, []);

  const handleDebtClick = useCallback((debt: Debt) => {
    setDetailDebt(debt);
  }, []);

  const handleEditFromDetail = useCallback((debt: Debt) => {
    setDetailDebt(undefined);
    setSelectedDebt(debt);
    setIsFormOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setIsFormOpen(false);
    setSelectedDebt(undefined);
  }, []);

  const handleDetailClose = useCallback(() => {
    setDetailDebt(undefined);
  }, []);

  const isLoading = !isInitialized || !isSecondaryLoaded;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top)-var(--dock-inset))]">
      <div className="page-shell flex-1 space-y-4">
        <PageHeader title={t('navigation.debts')} />
        {renderBody(
          debts.length,
          sortedDebts,
          summary,
          avalanche,
          defaultCurrency,
          handleDebtClick,
          handleAddClick,
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="gap-0 p-0 sm:max-w-[500px]"
          aria-describedby="debt-form-description"
          onOpenChange={handleFormClose}
          onFocusOutside={(e) => e.preventDefault()}
        >
          <div id="debt-form-description" className="sr-only">
            {t('debts.formDescription')}
          </div>
          <DebtForm debt={selectedDebt} onClose={handleFormClose} />
        </DialogContent>
      </Dialog>

      {renderDetailSheet(detailDebt, handleDetailClose, handleEditFromDetail)}

      {renderFab(debts.length, handleAddClick, t)}
    </div>
  );
};

export default DebtsView;

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <DebtsLoading />;
};

const sortDebts = (debts: Debt[]): Debt[] => {
  const live = debts.filter((d) => !d.is_completed);
  const cleared = debts.filter((d) => d.is_completed);
  const liveSorted = live.sort(
    (a, b) => Number(b.current_balance) - Number(a.current_balance),
  );

  return [...liveSorted, ...cleared];
};

const pickPayoffMonths = (avalanche: SimResult): number | null => {
  if (avalanche.monthsToPayoff > 0) {
    return avalanche.monthsToPayoff;
  }

  return null;
};

const pickPayoffDate = (avalanche: SimResult): string | null => {
  if (avalanche.monthsToPayoff > 0) {
    return avalanche.payoffDate;
  }

  return null;
};

const renderBody = (
  debtCount: number,
  sortedDebts: Debt[],
  summary: DebtSummary,
  avalanche: SimResult,
  defaultCurrency: string,
  onDebtClick: (debt: Debt) => void,
  onAddClick: () => void,
) => {
  if (debtCount === 0) {
    return <DebtsEmpty onAddClick={onAddClick} />;
  }

  const monthsToDebtFree = pickPayoffMonths(avalanche);
  const payoffDate = pickPayoffDate(avalanche);

  return (
    <>
      <DebtsHeader
        summary={summary}
        defaultCurrency={defaultCurrency}
        monthsToDebtFree={monthsToDebtFree}
        payoffDate={payoffDate}
      />

      <DebtPayoffPlanner debts={sortedDebts} />

      <div className="space-y-3">
        {sortedDebts.map((d, index) => (
          <div
            key={d.id}
            className="card-enter"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <DebtCard debt={d} onClick={onDebtClick} />
          </div>
        ))}
      </div>
    </>
  );
};

const renderDetailSheet = (
  debt: Debt | undefined,
  onClose: () => void,
  onEdit: (debt: Debt) => void,
) => {
  if (!debt) {
    return null;
  }

  return (
    <DebtDetailSheet
      debt={debt}
      open={true}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
};

const renderFab = (
  debtCount: number,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (debtCount === 0) {
    return null;
  }

  return (
    <div
      data-dock-action
      className="fixed bottom-(--dock-bottom) right-(--dock-edge) z-50"
    >
      <Button
        size="icon"
        onClick={onAddClick}
        className="lift h-14 w-14 rounded-full"
        aria-label={t('debts.addDebt')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
