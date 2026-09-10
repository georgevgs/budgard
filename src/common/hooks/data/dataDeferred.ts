import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';

// These feed Today tiles and app-wide milestone tracking as well as their
// own routes, so they retain the same foreground freshness as transactions.
export const fetchDeferredData = async (
  session: DataSession,
  signal: AbortSignal,
  isForced: boolean,
): Promise<void> => {
  const [accounts, goals, debts] = await Promise.all([
    dataService.getAccounts(session.ownerId, signal),
    dataService.getGoals(session.ownerId, signal),
    loadCurrentDebts(session, signal, isForced),
  ]);
  signal.throwIfAborted();
  session.setters.setAccounts(accounts);
  session.setters.setGoals(goals);
  session.setters.setDebts(debts);
  session.setters.setIsSecondaryLoaded(true);
};

const loadCurrentDebts = async (
  session: DataSession,
  signal: AbortSignal,
  isForced: boolean,
) => {
  // The database accrues daily in UTC. Debt/payment mutations recompute
  // balances server-side; a manual refresh can always force another accrual.
  const day = new Date(Date.now()).toISOString().slice(0, 10);
  if (isForced || session.lastDebtAccrualDay !== day) {
    try {
      await dataService.refreshDebtBalances(session.ownerId);
      signal.throwIfAborted();
      session.lastDebtAccrualDay = day;
    } catch {
      // A failed accrual remains due on the next refresh; debts still load.
    }
  }
  signal.throwIfAborted();

  return dataService.getDebts(session.ownerId, signal);
};
