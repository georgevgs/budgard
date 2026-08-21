import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useExpensesData,
  useIncomesData,
  useDataConfig,
} from '@/contexts/DataContext';
import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';
import { countsAsSpending } from '@/lib/spending';
import type { Expense } from '@/types/Expense';

const SIMILAR_LIMIT = 4;

export type TransactionDetail = {
  transaction: Expense | undefined;
  isIncome: boolean;
  currency: string;
  // Everything else with the same description, most recent first — the answer
  // to "how often do I do this", which a single row cannot give.
  similar: Expense[];
  // What this description has cost across the transaction's own month.
  monthTotal: number;
  monthCount: number;
  note: string;
  isNoteDirty: boolean;
  isExcluded: boolean;
  setNote: (value: string) => void;
  saveNote: () => Promise<void>;
  toggleExcluded: () => Promise<void>;
  remove: () => Promise<void>;
};

// Everything the detail screen needs about one transaction, including the
// context that makes it worth opening: how often this repeats and what it
// adds up to. A row on its own is just the amount you already saw in the list.
export const useTransactionDetail = (id: string): TransactionDetail => {
  const expenses = useExpensesData();
  const incomes = useIncomesData();
  const { defaultCurrency } = useDataConfig();
  const { handleExpenseSubmit, handleExpenseDelete } = useExpenseOps();
  const navigate = useNavigate();

  const transaction = useMemo(
    () => [...expenses, ...incomes].find((row) => row.id === id),
    [expenses, incomes, id],
  );

  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const stats = useMemo(
    () => buildStats(transaction, expenses, incomes),
    [transaction, expenses, incomes],
  );

  const savedNote = transaction?.note ?? '';
  const note = noteDraft ?? savedNote;

  const saveNote = async () => {
    if (!transaction || note === savedNote) {
      return;
    }
    await handleExpenseSubmit({ note: note.trim() || null }, transaction.id);
    setNoteDraft(null);
  };

  const toggleExcluded = async () => {
    if (!transaction) {
      return;
    }
    await handleExpenseSubmit(
      { is_excluded: !transaction.is_excluded },
      transaction.id,
    );
  };

  const remove = async () => {
    if (!transaction) {
      return;
    }
    // Leave before the row disappears from under the screen, or the detail
    // view renders its own not-found state for a frame on the way out.
    navigate(-1);
    await handleExpenseDelete(transaction.id);
  };

  return {
    transaction,
    isIncome: transaction?.type === 'income',
    currency: defaultCurrency,
    similar: stats.similar,
    monthTotal: stats.monthTotal,
    monthCount: stats.monthCount,
    note,
    isNoteDirty: note !== savedNote,
    isExcluded: Boolean(transaction?.is_excluded),
    setNote: setNoteDraft,
    saveNote,
    toggleExcluded,
    remove,
  };
};

// --- Helpers ---

const buildStats = (
  transaction: Expense | undefined,
  expenses: Expense[],
  incomes: Expense[],
) => {
  if (!transaction) {
    return { similar: [], monthTotal: 0, monthCount: 0 };
  }

  const pool = transaction.type === 'income' ? incomes : expenses;
  const label = normalise(transaction.description);
  const monthKey = transaction.date.slice(0, 7);

  const matches = pool.filter(
    (row) => row.id !== transaction.id && normalise(row.description) === label,
  );

  const thisMonth = pool.filter(
    (row) =>
      normalise(row.description) === label && row.date.slice(0, 7) === monthKey,
  );

  return {
    similar: [...matches]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, SIMILAR_LIMIT),
    // An excluded row is still one of these, but it is not part of the total.
    monthTotal: thisMonth.reduce((sum, row) => {
      if (transaction.type !== 'income' && !countsAsSpending(row)) {
        return sum;
      }

      return sum + row.amount;
    }, 0),
    monthCount: thisMonth.length,
  };
};

// "Tesco" and "tesco " are the same shop. Nothing cleverer than this until
// there is a real merchant field to match on.
const normalise = (description: string): string =>
  description.trim().toLowerCase();
