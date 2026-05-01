import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import { type Account, isLiability } from '@/types/Account';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import type { LucideIcon } from 'lucide-react';
import type { AccountKind } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

type Props = {
  account: Account;
  latestSnapshot?: AccountBalance;
  onClick: (account: Account) => void;
}

const AccountCard = ({ account, latestSnapshot, onClick }: Props) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const liability = isLiability(account.kind);
  const Icon = ICON_BY_KIND[account.kind];

  const lastUpdatedLabel = latestSnapshot
    ? t('networth.lastUpdated', {
        date: format(parseISO(latestSnapshot.recorded_at), 'MMM d', {
          locale: dateLocale,
        }),
      })
    : t('networth.notUpdated');

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick(account)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(account);
        }
      }}
      className="border-border/50 rounded-2xl cursor-pointer hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${account.color}20`, color: account.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{account.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {t(`networth.kind.${account.kind}`)} · {lastUpdatedLabel}
          </p>
        </div>
        <p
          className={cn(
            'text-base font-semibold tabular-nums shrink-0',
            liability ? 'text-destructive' : 'text-foreground',
          )}
        >
          {liability ? '−' : ''}
          {formatCurrency(account.current_balance, account.default_currency)}
        </p>
      </CardContent>
    </Card>
  );
}

export default AccountCard;

// --- Helpers ---

const ICON_BY_KIND: Record<AccountKind, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  credit_card: CreditCard,
  loan: CreditCard,
  investment: TrendingUp,
  other: Wallet,
};
