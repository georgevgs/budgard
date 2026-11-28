import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { cn, formatCurrency } from '@/constants/utils';
import { type Account, isLiability } from '@/types/Account';
import type { Locale } from 'date-fns';
import type { AccountKind } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { getColorTileStyle } from '@/constants/categoryColor';
import { CategoryIcon } from '@/common/components/common/CategoryIcon';
import type { TranslateFunction } from '@/constants/translate';

type AccountCardProps = {
  account: Account;
  latestSnapshot?: AccountBalance;
  onClick: (account: Account) => void;
};

export const AccountCard = ({
  account,
  latestSnapshot,
  onClick,
}: AccountCardProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const isLiabilityAccount = isLiability(account.kind);

  const lastUpdatedLabel = getLastUpdatedLabel(latestSnapshot, dateLocale, t);

  return (
    <SurfaceCard
      role="button"
      tabIndex={0}
      onClick={() => onClick(account)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(account);
        }
      }}
      className="cursor-pointer transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-[32%] flex items-center justify-center shrink-0"
          style={getColorTileStyle(account.color)}
        >
          <CategoryIcon
            icon={EMOJI_BY_KIND[account.kind]}
            className="h-[68%] w-[68%]"
          />
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
            isLiabilityAccount && 'text-destructive-ink',
            !isLiabilityAccount && 'text-foreground',
          )}
        >
          {renderLiabilityPrefix(isLiabilityAccount)}
          {formatCurrency(account.current_balance, account.default_currency)}
        </p>
      </div>
    </SurfaceCard>
  );
};

const getLastUpdatedLabel = (
  latestSnapshot: AccountBalance | undefined,
  dateLocale: Locale,
  t: TranslateFunction,
) => {
  if (!latestSnapshot) {
    return t('networth.notUpdated');
  }

  return t('networth.lastUpdated', {
    date: format(parseISO(latestSnapshot.recorded_at), 'd MMM', {
      locale: dateLocale,
    }),
  });
};

const renderLiabilityPrefix = (isLiabilityAccount: boolean) => {
  if (isLiabilityAccount) {
    return '−';
  }

  return '';
};

const EMOJI_BY_KIND: Record<AccountKind, string> = {
  cash: '💶',
  bank: '🏦',
  credit_card: '💳',
  loan: '💳',
  investment: '📈',
  other: '👛',
};
