import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Expense } from '@/types/Expense';

const auth = vi.hoisted(() => ({
  session: { user: { id: 'u1' } } as { user: { id: string } } | null,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

const data = vi.hoisted(() => ({
  expenses: [] as unknown[],
  categories: [] as unknown[],
  tags: [] as unknown[],
}));
vi.mock('@/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useCategoriesData: () => ({ expenseCategories: data.categories }),
  useTagsData: () => data.tags,
}));

const ops = vi.hoisted(() => ({
  handleExpenseDelete: vi.fn(),
  handleExpenseSubmit: vi.fn(),
}));
vi.mock('@/hooks/dataOps/useExpenseOps', () => ({
  useExpenseOps: () => ops,
}));

const templateOps = vi.hoisted(() => ({ handleTemplateCreate: vi.fn() }));
vi.mock('@/hooks/dataOps/useTemplateOps', () => ({
  useTemplateOps: () => templateOps,
}));

import { useOptimisticExpenseActions } from '@/hooks/expensesList/useOptimisticExpenseActions';

// --- Fixtures ---

const expense = (over: Partial<Expense> = {}): Expense =>
  ({
    id: 'e1',
    user_id: 'u1',
    amount: 10,
    description: 'Coffee',
    date: '2026-08-01',
    category_id: 'c1',
    ...over,
  }) as Expense;

const render = () => renderHook(() => useOptimisticExpenseActions()).result;

beforeEach(() => {
  vi.clearAllMocks();
  auth.session = { user: { id: 'u1' } };
  data.expenses = [];
  data.categories = [{ id: 'c1', name: 'Food', type: 'expense' }];
  data.tags = [
    { id: 't1', name: 'Work', color: '#111' },
    { id: 't2', name: 'Trip', color: '#222' },
  ];
  ops.handleExpenseDelete.mockResolvedValue(undefined);
  ops.handleExpenseSubmit.mockResolvedValue(undefined);
});

describe('delete', () => {
  it('ignores a row that only exists optimistically', async () => {
    // A temp- id was never sent to the server; deleting it would 404.
    const r = render();

    await act(async () => {
      r.current.handleExpenseDelete('temp-123');
    });

    expect(ops.handleExpenseDelete).not.toHaveBeenCalled();
  });

  it('deletes a real row', async () => {
    data.expenses = [expense({ id: 'e1' })];
    const r = render();

    await act(async () => {
      r.current.handleExpenseDelete('e1');
    });

    expect(ops.handleExpenseDelete).toHaveBeenCalledWith('e1');
  });

  it('does not blow up the app when the delete fails', async () => {
    // The ops hook owns the retry toast; letting the error escape the
    // transition would swap the app for the route error boundary.
    data.expenses = [expense({ id: 'e1' })];
    ops.handleExpenseDelete.mockRejectedValue(new Error('down'));
    const r = render();

    await act(async () => {
      r.current.handleExpenseDelete('e1');
    });

    await waitFor(() => expect(ops.handleExpenseDelete).toHaveBeenCalled());
    // The canonical list is restored rather than left mid-delete.
    expect(r.current.optimisticExpenses.map((e) => e.id)).toEqual(['e1']);
  });
});

describe('form submit', () => {
  it('passes the payload through untouched, extras included', async () => {
    const r = render();
    const payload = {
      amount: 5,
      description: 'Tea',
      date: '2026-08-02',
      user_id: 'u1',
      category_id: 'c1',
      tag_id: 't1',
      extra_tag_ids: ['t2'],
    };

    await act(async () => {
      r.current.handleExpenseFormSubmit(payload as never);
    });

    // The write-only field must survive to the service (offline replay needs
    // it) even though the optimistic row strips it.
    expect(ops.handleExpenseSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ extra_tag_ids: ['t2'] }),
      undefined,
      undefined,
    );
  });

  it('forwards the id and receipt options on an edit', async () => {
    data.expenses = [expense({ id: 'e1' })];
    const r = render();
    const receiptOptions = {
      receiptFile: null,
      removeExistingReceipt: true,
      existingReceiptPath: 'r/p.jpg',
    };

    await act(async () => {
      r.current.handleExpenseFormSubmit(
        { amount: 9 } as never,
        'e1',
        receiptOptions,
      );
    });

    expect(ops.handleExpenseSubmit).toHaveBeenCalledWith(
      expect.anything(),
      'e1',
      receiptOptions,
    );
  });

  it('survives a failed submit without escaping the transition', async () => {
    ops.handleExpenseSubmit.mockRejectedValue(new Error('down'));
    const r = render();

    await act(async () => {
      r.current.handleExpenseFormSubmit({
        amount: 5,
        description: 'Tea',
        date: '2026-08-02',
        user_id: 'u1',
      } as never);
    });

    await waitFor(() => expect(ops.handleExpenseSubmit).toHaveBeenCalled());
    expect(r.current.optimisticExpenses).toEqual([]);
  });
});

describe('templates', () => {
  it('saves an expense as a template without its date or receipt', async () => {
    const r = render();

    act(() => {
      r.current.handleSaveAsTemplate(
        expense({ amount: 12, description: 'Lunch', tag_id: 't1' }),
      );
    });

    expect(templateOps.handleTemplateCreate).toHaveBeenCalledWith({
      amount: 12,
      description: 'Lunch',
      category_id: 'c1',
      tag_id: 't1',
      original_currency: null,
    });
  });

  it('files a template against today', async () => {
    const r = render();

    await act(async () => {
      r.current.handleUseTemplate({
        id: 'tpl1',
        amount: 3,
        description: 'Coffee',
        category_id: 'c1',
        tag_id: 't1',
      } as never);
    });

    const payload = ops.handleExpenseSubmit.mock.calls[0][0];
    expect(payload.amount).toBe(3);
    expect(payload.user_id).toBe('u1');
    expect(payload.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does nothing without a signed-in user', async () => {
    auth.session = null;
    const r = render();

    await act(async () => {
      r.current.handleUseTemplate({
        id: 'tpl1',
        amount: 3,
        description: 'Coffee',
      } as never);
    });

    expect(ops.handleExpenseSubmit).not.toHaveBeenCalled();
  });
});

describe('optimistic list', () => {
  it('starts as the canonical list', () => {
    data.expenses = [expense({ id: 'a' }), expense({ id: 'b' })];

    expect(render().current.optimisticExpenses.map((e) => e.id)).toEqual([
      'a',
      'b',
    ]);
  });
});
