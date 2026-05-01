import AccountCard from '@/components/networth/AccountCard';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

type Props = {
  title: string;
  accounts: Account[];
  latestSnapshotByAccount: Map<string, AccountBalance>;
  onAccountClick: (account: Account) => void;
}

const AccountGroup = ({
  title,
  accounts,
  latestSnapshotByAccount,
  onAccountClick,
}: Props) => {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground px-1">{title}</h3>
      <div className="space-y-2">
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            latestSnapshot={latestSnapshotByAccount.get(a.id)}
            onClick={onAccountClick}
          />
        ))}
      </div>
    </section>
  );
}

export default AccountGroup;
