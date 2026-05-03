import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Home from 'lucide-react/dist/esm/icons/home';
import Car from 'lucide-react/dist/esm/icons/car';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import HandCoins from 'lucide-react/dist/esm/icons/hand-coins';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import type { LucideIcon } from 'lucide-react';
import type { Debt, DebtKind } from '@/types/Debt';
import { useDebtProgress } from '@/hooks/useDebtProgress';
import DebtProgressBar from '@/components/debts/DebtProgressBar';

type Props = {
  debt: Debt;
  onClick: (debt: Debt) => void;
}

const DebtCard = ({ debt, onClick }: Props) => {
  const { t } = useTranslation();
  const progress = useDebtProgress(debt);
  const Icon = ICON_BY_KIND[debt.kind];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(debt)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(debt);
        }
      }}
      className="border-border/50 rounded-2xl cursor-pointer hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${debt.color}20`, color: debt.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{debt.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {t(`debts.kind.${debt.kind}`)} · {t('debts.aprSuffix', { apr: debt.apr.toFixed(2) })}
            </p>
          </div>
          <p className="text-base font-semibold tabular-nums shrink-0 text-destructive">
            {formatCurrency(debt.current_balance, debt.currency)}
          </p>
        </div>

        <DebtProgressBar progress={progress} currency={debt.currency} />

        {renderUnpayableHint(progress.isUnpayable, t)}
      </CardContent>
    </Card>
  );
}

export default DebtCard;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const ICON_BY_KIND: Record<DebtKind, LucideIcon> = {
  credit_card: CreditCard,
  student_loan: GraduationCap,
  mortgage: Home,
  auto_loan: Car,
  personal_loan: HandCoins,
  medical: Heart,
  other: Wallet,
};

const renderUnpayableHint = (isUnpayable: boolean, t: TranslateFunction) => {
  if (!isUnpayable) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-destructive">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{t('debts.unpayableShort')}</span>
    </div>
  );
}
