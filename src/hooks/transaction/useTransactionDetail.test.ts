import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Expense } from '@/types/Expense';

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

const data = vi.hoisted(() => ({
  expenses: [] as unknown[],
  incomes: [] as unknown[],
}));
vi.mock('@/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useIncomesData: () => data.incomes,
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
}));

const ops = vi.hoisted(() => ({
  handleExpenseSubmit: vi.fn(),
  handleExpenseDelete: vi.fn(),
}));
vi.mock('@/hooks/dataOps/useExpenseOps', () => ({ useExpenseOps: () => ops }));

import { useTransactionDetail } from '@/hooks/transaction/useTransactionDetail';

// --- Fixtures ---

const row = (over: Partial<Expense> = {}): Expense =>
  ({
    id: 'e1',
    description: 'Tesco',
    amount: 10,
    date: '2026-08-10',
    type: 'expense',
    is_excluded: false,
    note: null,
    ...over,
  }) as Expense;

const render = (id = 'e1') =>
  renderHook(() => useTransactionDetail(id)).result;

beforeEach(() => {
  vi.clearAllMocks();
  data.expenses = [];
  data.incomes = [];
  ops.handleExpenseSubmit.mockResolvedValue(undefined);
  ops.handleExpenseDelete.mockResolvedValue(undefined);
});

describe('finding the transaction', () => {
  it('looks in incomes as well as expenses', () => {
    data.incomes = [row({ id: 'i1', type: 'income', description: 'Salary' })];
    const r = render('i1');

    expect(r.current.transaction?.id).toBe('i1');
    expect(r.current.isIncome).toBe(true);
  });

  it('reports nothing rather than throwing for an unknown id', () => {
    const r = render('missing');

    expect(r.current.transaction).toBeUndefined();
    expect(r.current.similar).toEqual([]);
    expect(r.current.monthTotal).toBe(0);
  });
});

describe('similar transactions', () => {
  beforeEach(() => {
    data.expenses = [
      row({ id: 'e1', date: '2026-08-10' }),
      row({ id: 'e2', date: '2026-08-01' }),
      row({ id: 'e3', date: '2026-07-15' }),
      row({ id: 'other', description: 'Coffee', date: '2026-08-05' }),
    ];
  });

  it('matches on description, ignoring case and stray spaces', () => {
    // "Tesco" and "tesco " are the same shop.
    data.expenses = [
      row({ id: 'e1' }),
      row({ id: 'e2', description: '  tesco ' }),
    ];

    expect(render().current.similar.map((s) => s.id)).toEqual(['e2']);
  });

  it('excludes the transaction itself', () => {
    expect(render().current.similar.map((s) => s.id)).not.toContain('e1');
  });

  it('lists the most recent first', () => {
    expect(render().current.similar.map((s) => s.id)).toEqual(['e2', 'e3']);
  });

  it('caps the list rather than showing a whole history', () => {
    data.expenses = [
      row({ id: 'e1' }),
      ...Array.from({ length: 10 }, (_, i) =>
        row({ id: `x${i}`, date: `2026-07-${String(i + 1).padStart(2, '0')}` }),
      ),
    ];

    expect(render().current.similar).toHaveLength(4);
  });

  it('does not mix incomes into an expense list', () => {
    data.incomes = [row({ id: 'i1', type: 'income', description: 'Tesco' })];

    expect(render().current.similar.map((s) => s.id)).not.toContain('i1');
  });
});

describe('month totals', () => {
  it('sums the same description across the transaction own month', () => {
    data.expenses = [
      row({ id: 'e1', amount: 10, date: '2026-08-10' }),
      row({ id: 'e2', amount: 15, date: '2026-08-20' }),
      row({ id: 'e3', amount: 99, date: '2026-07-01' }),
    ];
    const r = render();

    expect(r.current.monthTotal).toBe(25);
    expect(r.current.monthCount).toBe(2);
  });

  it('counts an excluded row but leaves it out of the total', () => {
    data.expenses = [
      row({ id: 'e1', amount: 10 }),
      row({ id: 'e2', amount: 15, is_excluded: true }),
    ];
    const r = render();

    expect(r.current.monthTotal).toBe(10);
    expect(r.current.monthCount).toBe(2);
  });
});

describe('the note', () => {
  it('shows the saved note until it is edited', () => {
    data.expenses = [row({ note: 'Weekly shop' })];
    const r = render();

    expect(r.current.note).toBe('Weekly shop');
    expect(r.current.isNoteDirty).toBe(false);
  });

  it('tracks the draft as dirty', () => {
    data.expenses = [row({ note: 'Weekly shop' })];
    const r = render();

    act(() => r.current.setNote('Changed'));

    expect(r.current.note).toBe('Changed');
    expect(r.current.isNoteDirty).toBe(true);
  });

  it('does not write when nothing changed', async () => {
    data.expenses = [row({ note: 'Weekly shop' })];
    const r = render();

    await act(async () => {
      await r.current.saveNote();
    });

    expect(ops.handleExpenseSubmit).not.toHaveBeenCalled();
  });

  it('trims on save and stores an emptied note as null', async () => {
    data.expenses = [row({ note: 'Weekly shop' })];
    const r = render();

    act(() => r.current.setNote('   '));
    await act(async () => {
      await r.current.saveNote();
    });

    expect(ops.handleExpenseSubmit).toHaveBeenCalledWith({ note: null }, 'e1');
  });

  it('saves a real note and drops the draft afterwards', async () => {
    data.expenses = [row({ note: null })];
    const r = render();

    act(() => r.current.setNote('  Paid in cash '));
    await act(async () => {
      await r.current.saveNote();
    });

    expect(ops.handleExpenseSubmit).toHaveBeenCalledWith(
      { note: 'Paid in cash' },
      'e1',
    );
    expect(r.current.isNoteDirty).toBe(false);
  });
});

describe('exclusion and delete', () => {
  it('flips the exclusion flag', async () => {
    data.expenses = [row({ is_excluded: false })];
    const r = render();

    expect(r.current.isExcluded).toBe(false);
    await act(async () => {
      await r.current.toggleExcluded();
    });

    expect(ops.handleExpenseSubmit).toHaveBeenCalledWith(
      { is_excluded: true },
      'e1',
    );
  });

  it('navigates away before deleting, not after', async () => {
    // Otherwise the detail screen renders its own not-found state for a frame
    // as the row disappears from under it.
    const order: string[] = [];
    mockNavigate.mockImplementation(() => order.push('navigate'));
    ops.handleExpenseDelete.mockImplementation(async () => {
      order.push('delete');
    });
    data.expenses = [row()];
    const r = render();

    await act(async () => {
      await r.current.remove();
    });

    expect(order).toEqual(['navigate', 'delete']);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does nothing for a transaction that is not there', async () => {
    const r = render('missing');

    await act(async () => {
      await r.current.remove();
      await r.current.toggleExcluded();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(ops.handleExpenseDelete).not.toHaveBeenCalled();
    expect(ops.handleExpenseSubmit).not.toHaveBeenCalled();
  });
});
