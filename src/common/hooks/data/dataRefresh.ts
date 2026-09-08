import { captureException } from '@/config/sentry';
import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';
import { replaceRecentWindow } from '@/common/contexts/dataContextHelpers';
import { getRecentCutoff } from '@/constants/dataCache';

export const refreshTransactions = (
  session: DataSession,
  type: 'expenses' | 'incomes',
): Promise<void> => {
  return runRefresh(session, `refresh ${type}`, async () => {
    const recentCutoff = getRecentCutoff();
    const includesFullHistory = session.isHistoryLoaded;
    let sinceDate: string | undefined;
    if (!includesFullHistory) {
      sinceDate = recentCutoff;
    }
    let getRows = dataService.getExpenses;
    let setRows = session.setters.setExpenses;
    if (type === 'incomes') {
      getRows = dataService.getIncomes;
      setRows = session.setters.setIncomes;
    }
    const rows = await getRows(session.ownerId, undefined, sinceDate);
    if (!session.isActive) {
      return;
    }
    if (includesFullHistory) {
      setRows(rows);

      return;
    }
    setRows((prev) => replaceRecentWindow(prev, rows, recentCutoff));
  });
};

export const refreshAccounts = (session: DataSession): Promise<void> => {
  return runRefresh(session, 'refresh accounts', async () => {
    const [accounts, balances] = await Promise.all([
      dataService.getAccounts(session.ownerId),
      dataService.getAllAccountBalances(session.ownerId),
    ]);
    if (!session.isActive) {
      return;
    }
    session.setters.setAccounts(accounts);
    session.setters.setAccountBalances(balances);
  });
};

export const refreshDebts = (session: DataSession): Promise<void> => {
  return runRefresh(session, 'refresh debts', async () => {
    const debts = await dataService.getDebts(session.ownerId);
    if (session.isActive) {
      session.setters.setDebts(debts);
    }
  });
};

const runRefresh = async (
  session: DataSession,
  context: string,
  load: () => Promise<void>,
): Promise<void> => {
  if (!session.isActive) {
    return;
  }
  try {
    await load();
  } catch (error) {
    if (!session.isActive) {
      return;
    }
    captureException(error, { tags: { context } });
    console.error(`Failed to ${context}:`, error);
    const { t, toast } = session.getFeedback();
    toast({
      title: t('common.error'),
      description: t('common.refreshFailed'),
      variant: 'destructive',
      action: {
        label: t('common.tryAgain'),
        onClick: () => {
          void runRefresh(session, context, load);
        },
      },
    });
  }
};
