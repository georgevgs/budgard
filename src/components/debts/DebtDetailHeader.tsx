import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ScrollSafeDropdownMenuTrigger from '@/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import MoreVertical from 'lucide-react/dist/esm/icons/more-vertical';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { formatCurrency } from '@/lib/utils';
import type { DebtProgress } from '@/hooks/useDebtProgress';
import type { Debt } from '@/types/Debt';
import DebtProgressBar from '@/components/debts/DebtProgressBar';

type Props = {
  debt: Debt;
  progress: DebtProgress;
  onEdit: (debt: Debt) => void;
  onArchiveRequest: () => void;
};

const DebtDetailHeader = ({
  debt,
  progress,
  onEdit,
  onArchiveRequest,
}: Props) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleEditClick = () => {
    setMenuOpen(false);
    setTimeout(() => onEdit(debt), 0);
  };

  const handleArchiveClick = () => {
    setMenuOpen(false);
    setTimeout(() => onArchiveRequest(), 0);
  };

  return (
    <DialogHeader className="p-4 pb-2" data-draggable-area>
      <div className="flex items-start justify-between gap-3 pr-10">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl truncate">{debt.name}</DialogTitle>
          <DialogDescription>
            {t(`debts.kind.${debt.kind}`)} ·{' '}
            {t('debts.aprSuffix', { apr: debt.apr.toFixed(2) })}
          </DialogDescription>
        </div>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <ScrollSafeDropdownMenuTrigger
            asChild
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
          >
            <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('common.openMenu')}</span>
            </Button>
          </ScrollSafeDropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleEditClick}>
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleArchiveClick}
              className="text-destructive-ink focus:text-destructive-ink"
            >
              {t('debts.archive')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pt-3">
        <p className="text-xs text-muted-foreground">
          {t('debts.detail.currentBalance')}
        </p>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-destructive-ink">
          {formatCurrency(debt.current_balance, debt.currency)}
        </p>
      </div>

      <div className="pt-3">
        <DebtProgressBar progress={progress} currency={debt.currency} />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 text-xs">
        <div>
          <p className="text-muted-foreground">
            {t('debts.detail.minPayment')}
          </p>
          <p className="font-medium tabular-nums mt-0.5">
            {formatCurrency(debt.minimum_payment, debt.currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t('debts.detail.payoffIn')}</p>
          <p className="font-medium tabular-nums mt-0.5">
            {renderPayoffMonths(progress, t)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t('debts.detail.totalInterest')}
          </p>
          <p className="font-medium tabular-nums mt-0.5">
            {formatCurrency(progress.projectedTotalInterest, debt.currency)}
          </p>
        </div>
      </div>

      {renderUnpayableCallout(progress.isUnpayable, t)}
    </DialogHeader>
  );
};

export default DebtDetailHeader;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderPayoffMonths = (progress: DebtProgress, t: TranslateFunction) => {
  if (progress.isUnpayable || progress.monthsRemaining <= 0) {
    return '—';
  }

  return t('debts.monthsCount', { count: progress.monthsRemaining });
};

const renderUnpayableCallout = (isUnpayable: boolean, t: TranslateFunction) => {
  if (!isUnpayable) return null;

  return (
    <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertTriangle className="h-4 w-4 text-destructive-ink shrink-0 mt-0.5" />
      <div className="text-xs">
        <p className="font-medium text-destructive-ink">
          {t('debts.unpayable.title')}
        </p>
        <p className="text-destructive-ink/80 mt-0.5">
          {t('debts.unpayable.description')}
        </p>
      </div>
    </div>
  );
};
