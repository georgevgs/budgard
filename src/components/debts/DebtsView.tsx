import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/DataContext';
import { useDebts } from '@/hooks/useDebts';
import { useDebtPayoffPlan } from '@/hooks/useDebtPayoffPlan';
import type { Debt } from '@/types/Debt';
import DebtsHeader from '@/components/debts/DebtsHeader';
import DebtsEmpty from '@/components/debts/DebtsEmpty';
import DebtsLoadingState from '@/components/debts/DebtsLoading';
import DebtCard from '@/components/debts/DebtCard';
import DebtForm from '@/components/debts/DebtForm';
import DebtDetailSheet from '@/components/debts/DebtDetailSheet';
import DebtPayoffPlan from '@/components/debts/DebtPayoffPlan';

type Tab = 'list' | 'plan';

const DebtsView = () => {
  const { t } = useTranslation();
  const { defaultCurrency, isInitialized } = useData();
  const { debts, summary } = useDebts();
  const { avalanche } = useDebtPayoffPlan(debts, 0);
  const [tab, setTab] = useState<Tab>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>();
  const [detailDebt, setDetailDebt] = useState<Debt | undefined>();

  const sortedDebts = useMemo(() => {
    const live = debts.filter((d) => !d.is_completed);
    const cleared = debts.filter((d) => d.is_completed);

    return [
      ...live.sort((a, b) => Number(b.current_balance) - Number(a.current_balance)),
      ...cleared,
    ];
  }, [debts]);

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

  if (!isInitialized) {
    return <DebtsLoadingState />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-58px)]">
      <div className="flex-1 container max-w-4xl mx-auto px-4 pt-5 pb-4 space-y-4">
        {renderBody(
          debts.length,
          tab,
          setTab,
          sortedDebts,
          summary,
          avalanche,
          defaultCurrency,
          handleDebtClick,
          handleAddClick,
          t,
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden"
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
}

export default DebtsView;

// --- Helpers ---

import type { DebtSummary } from '@/hooks/useDebts';
import type { SimResult } from '@/lib/debtPayoff';

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderBody = (
  debtCount: number,
  tab: Tab,
  setTab: (tab: Tab) => void,
  sortedDebts: Debt[],
  summary: DebtSummary,
  avalanche: SimResult,
  defaultCurrency: string,
  onDebtClick: (debt: Debt) => void,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (debtCount === 0) {
    return <DebtsEmpty onAddClick={onAddClick} />;
  }

  const monthsToDebtFree = avalanche.monthsToPayoff > 0 ? avalanche.monthsToPayoff : null;
  const payoffDate = avalanche.monthsToPayoff > 0 ? avalanche.payoffDate : null;

  return (
    <>
      <DebtsHeader
        summary={summary}
        defaultCurrency={defaultCurrency}
        monthsToDebtFree={monthsToDebtFree}
        payoffDate={payoffDate}
      />

      {renderTabs(tab, setTab, t)}

      {tab === 'list' ? (
        <div className="space-y-3">
          {sortedDebts.map((d) => (
            <DebtCard key={d.id} debt={d} onClick={onDebtClick} />
          ))}
        </div>
      ) : (
        <DebtPayoffPlan debts={sortedDebts} defaultCurrency={defaultCurrency} />
      )}
    </>
  );
}

const renderTabs = (
  tab: Tab,
  setTab: (tab: Tab) => void,
  t: TranslateFunction,
) => (
  <div className="flex gap-1 p-1 bg-muted rounded-xl">
    <button
      type="button"
      onClick={() => setTab('list')}
      className={cn(
        'flex-1 text-sm font-medium py-2 rounded-lg transition-colors',
        tab === 'list'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {t('debts.tabs.list')}
    </button>
    <button
      type="button"
      onClick={() => setTab('plan')}
      className={cn(
        'flex-1 text-sm font-medium py-2 rounded-lg transition-colors',
        tab === 'plan'
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {t('debts.tabs.plan')}
    </button>
  </div>
);

const renderDetailSheet = (
  debt: Debt | undefined,
  onClose: () => void,
  onEdit: (debt: Debt) => void,
) => {
  if (!debt) return null;

  return (
    <DebtDetailSheet
      debt={debt}
      open={true}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
}

const renderFab = (
  debtCount: number,
  onAddClick: () => void,
  t: TranslateFunction,
) => {
  if (debtCount === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 pb-safe-b">
      <Button
        size="icon"
        onClick={onAddClick}
        className="h-14 w-14 rounded-full shadow-lg shadow-primary/30"
        aria-label={t('debts.addDebt')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
