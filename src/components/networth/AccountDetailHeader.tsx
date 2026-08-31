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
import { cn, formatCurrency } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { type Account, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import {
  renderSinceLast,
  renderInvestmentDetail,
  getBalanceClass,
  renderLiabilitySign,
} from '@/components/networth/AccountDetailSheet.helpers';

type Props = {
  account: Account;
  snapshots: AccountBalance[];
  onEdit: (account: Account) => void;
  onArchiveRequest: () => void;
};

const AccountDetailHeader = ({
  account,
  snapshots,
  onEdit,
  onArchiveRequest,
}: Props) => {
  const { t } = useTranslation();
  const { isPro } = useSubscription();
  const [menuOpen, setMenuOpen] = useState(false);

  const liability = isLiability(account.kind);
  const isInvestment = account.kind === 'investment';

  const handleEditClick = () => {
    setMenuOpen(false);
    setTimeout(() => onEdit(account), 0);
  };

  const handleArchiveClick = () => {
    setMenuOpen(false);
    setTimeout(() => onArchiveRequest(), 0);
  };

  return (
    <DialogHeader className="p-4 pb-2" data-draggable-area>
      <div className="flex items-start justify-between gap-3 pr-10">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl truncate">{account.name}</DialogTitle>
          <DialogDescription>
            {t(`networth.kind.${account.kind}`)}
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
              {t('networth.archive')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="pt-3">
        <p className="text-xs text-muted-foreground">
          {t('networth.detail.currentBalance')}
        </p>
        <p
          className={cn(
            'text-2xl font-bold tabular-nums tracking-tight',
            getBalanceClass(liability),
          )}
        >
          {renderLiabilitySign(liability)}
          {formatCurrency(account.current_balance, account.default_currency)}
        </p>
        {renderSinceLast(isInvestment, snapshots, account.default_currency, t)}
        {renderInvestmentDetail(account, isInvestment, snapshots, t, isPro)}
      </div>
    </DialogHeader>
  );
};

export default AccountDetailHeader;
