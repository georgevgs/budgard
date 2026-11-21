import { describe, expect, it } from 'vitest';
import { detectRecurringSuggestions } from '@/pages/recurring/utils/recurringDetection';
import type { Expense } from '@/types/Expense';

const monthlyExpense = (id: string, date: string, amount: number): Expense =>
  ({
    id,
    description: 'Streaming',
    amount,
    date,
    type: 'expense',
    is_excluded: false,
  }) as Expense;

describe('detectRecurringSuggestions', () => {
  it('rounds the average amount half away from zero', () => {
    const transactions = [
      monthlyExpense('a', '2026-05-01', 1.005),
      monthlyExpense('b', '2026-06-01', 1.005),
      monthlyExpense('c', '2026-07-01', 1.005),
    ];

    const [suggestion] = detectRecurringSuggestions(
      transactions,
      [],
      new Set<string>(),
    );

    expect(suggestion.amount).toBe(1.01);
  });
});
