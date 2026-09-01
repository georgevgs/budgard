import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { describeAmount } from '@/lib/transactionAmount';
import type { Expense } from '@/types/Expense';

// --- Mocks ---

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: 'u1' }),
}));

const mockShowErrorToast = vi.fn();
vi.mock('@/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => mockShowErrorToast,
}));

// vi.mock factories are hoisted above these declarations, so anything a
// factory reads eagerly has to be created by vi.hoisted.
const mockHaptics = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/haptics', () => ({ haptics: mockHaptics }));

vi.mock('@/lib/sentry', () => ({ captureException: vi.fn() }));

const mockDataService = vi.hoisted(() => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  createExpensesBulk: vi.fn(),
}));
vi.mock('@/services/dataService', () => ({
  dataService: mockDataService,
}));

const mockUploadReceipt = vi.fn();
const mockDeleteReceipt = vi.fn();
vi.mock('@/services/receiptService', () => ({
  uploadReceipt: (...args: unknown[]) => mockUploadReceipt(...args),
  deleteReceipt: (...args: unknown[]) => mockDeleteReceipt(...args),
}));

const mockEnqueue = vi.fn();
vi.mock('@/lib/offlineQueue', () => ({
  offlineQueue: {
    enqueueWithReconcile: (...args: unknown[]) => mockEnqueue(...args),
  },
  createTempId: () => 'temp-123',
}));

let offline = false;
vi.mock('@/lib/offlineError', () => ({
  isOfflineError: () => offline,
}));

const mockSetExpenses = vi.fn();
const mockRefreshDebts = vi.fn();
const mockRefreshExpenses = vi.fn();
const expensesRef = { current: [] as Expense[] };

vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true, defaultCurrency: 'EUR' }),
  useDataActions: () => ({
    setExpenses: mockSetExpenses,
    refreshDebts: mockRefreshDebts,
    refreshExpenses: mockRefreshExpenses,
    expensesRef,
  }),
}));

import { useExpenseOps } from '@/hooks/dataOps/useExpenseOps';

// --- Fixtures ---

const makeExpense = (overrides: Partial<Expense> = {}): Expense =>
  ({
    id: 'e1',
    user_id: 'u1',
    date: '2026-08-01',
    description: 'Coffee',
    amount: 3.5,
    category_id: 'c1',
    receipt_path: null,
    debt_id: null,
    type: 'expense',
    created_at: '2026-08-01',
    ...overrides,
  }) as Expense;

// Runs the state updater the hook handed to setExpenses against `prev`, so the
// optimistic result can be asserted on directly.
const applyLastSetExpenses = (prev: Expense[]): Expense[] => {
  const { calls } = mockSetExpenses.mock;
  const updater = calls[calls.length - 1][0] as (p: Expense[]) => Expense[];

  return updater(prev);
};

const renderOps = () => renderHook(() => useExpenseOps()).result;

beforeEach(() => {
  vi.clearAllMocks();
  offline = false;
  expensesRef.current = [];
  mockRefreshDebts.mockResolvedValue(undefined);
});

// --- handleExpenseSubmit: create / update ---

describe('handleExpenseSubmit', () => {
  it('creates a new expense and prepends it to state', async () => {
    const saved = makeExpense({ id: 'new-1' });
    mockDataService.createExpense.mockResolvedValue(saved);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({ amount: 3.5 } as never);
    });

    expect(mockDataService.createExpense).toHaveBeenCalled();
    expect(mockDataService.updateExpense).not.toHaveBeenCalled();
    expect(applyLastSetExpenses([makeExpense({ id: 'old' })])).toEqual([
      saved,
      makeExpense({ id: 'old' }),
    ]);
    expect(mockHaptics.success).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
  });

  it('offers an undo on the added toast that deletes the new row', async () => {
    const saved = makeExpense({ id: 'new-1', amount: 12, description: 'Sample' });
    mockDataService.createExpense.mockResolvedValue(saved);
    mockDataService.deleteExpense.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({ amount: 12 } as never);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'success',
        description: `${describeAmount(12, 'expense', 'EUR').text} · Sample`,
        action: expect.objectContaining({ label: 'common.undo' }),
      }),
    );

    const [{ action }] = mockToast.mock.calls[0] as [{ action: { onClick: () => void } }];
    await act(async () => {
      action.onClick();
    });

    expect(mockDataService.deleteExpense).toHaveBeenCalledWith('new-1');
  });

  it('does not offer undo when editing an existing expense', async () => {
    mockDataService.updateExpense.mockResolvedValue(
      makeExpense({ id: 'e1', description: 'Tea' }),
    );

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({ amount: 1 } as never, 'e1');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ action: undefined }),
    );
  });

  it('updates an existing expense in place', async () => {
    const saved = makeExpense({ id: 'e1', description: 'Tea' });
    mockDataService.updateExpense.mockResolvedValue(saved);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({ amount: 1 } as never, 'e1');
    });

    expect(mockDataService.createExpense).not.toHaveBeenCalled();
    expect(applyLastSetExpenses([makeExpense({ id: 'e1' })])).toEqual([saved]);
  });

  it('removes a converted debt payment from the expense list on edit', async () => {
    // A debt payment is not an expense row — editing one into a debt payment
    // has to drop it from the list rather than leave a ghost.
    mockDataService.updateExpense.mockResolvedValue(
      makeExpense({ id: 'e1', type: 'debt_payment', debt_id: 'd1' }),
    );

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never, 'e1');
    });

    expect(applyLastSetExpenses([makeExpense({ id: 'e1' })])).toEqual([]);
    expect(mockRefreshDebts).toHaveBeenCalled();
  });

  it('does not add a newly created debt payment to the expense list', async () => {
    mockDataService.createExpense.mockResolvedValue(
      makeExpense({ id: 'n1', type: 'debt_payment', debt_id: 'd1' }),
    );

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never);
    });

    const existing = [makeExpense({ id: 'old' })];
    expect(applyLastSetExpenses(existing)).toEqual(existing);
  });

  it('refreshes debts when an expense leaves a debt it used to belong to', async () => {
    expensesRef.current = [makeExpense({ id: 'e1', debt_id: 'd-old' })];
    mockDataService.updateExpense.mockResolvedValue(
      makeExpense({ id: 'e1', debt_id: null }),
    );

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never, 'e1');
    });

    expect(mockRefreshDebts).toHaveBeenCalled();
  });
});

// --- handleExpenseSubmit: receipts ---

describe('handleExpenseSubmit receipts', () => {
  it('uploads a receipt, persists its path, and deletes the replaced one', async () => {
    const saved = makeExpense({ id: 'e1', receipt_path: 'old/path.jpg' });
    mockDataService.updateExpense
      .mockResolvedValueOnce(saved)
      .mockResolvedValueOnce(
        makeExpense({ id: 'e1', receipt_path: 'new/p.jpg' }),
      );
    mockUploadReceipt.mockResolvedValue('new/p.jpg');
    mockDeleteReceipt.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never, 'e1', {
        receiptFile: new File(['x'], 'r.jpg'),
        removeExistingReceipt: false,
        existingReceiptPath: 'old/path.jpg',
      });
    });

    expect(mockUploadReceipt).toHaveBeenCalled();
    // Second updateExpense call writes the new path back.
    expect(mockDataService.updateExpense).toHaveBeenCalledTimes(2);
    expect(mockDataService.updateExpense).toHaveBeenLastCalledWith(
      { receipt_path: 'new/p.jpg' },
      'e1',
    );
    expect(mockDeleteReceipt).toHaveBeenCalledWith('old/path.jpg');
  });

  it('warns but still saves the expense when the upload fails', async () => {
    mockDataService.updateExpense.mockResolvedValue(makeExpense({ id: 'e1' }));
    mockUploadReceipt.mockRejectedValue(new Error('upload down'));

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never, 'e1', {
        receiptFile: new File(['x'], 'r.jpg'),
        removeExistingReceipt: false,
        existingReceiptPath: null,
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
    // The expense itself still landed in state.
    expect(mockSetExpenses).toHaveBeenCalled();
  });

  it('deletes the just-uploaded file when writing its path back fails', async () => {
    // Otherwise the upload orphans a file no row points at.
    mockDataService.updateExpense
      .mockResolvedValueOnce(makeExpense({ id: 'e1' }))
      .mockRejectedValueOnce(new Error('db down'));
    mockUploadReceipt.mockResolvedValue('new/p.jpg');
    mockDeleteReceipt.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await expect(
        ops.current.handleExpenseSubmit({} as never, 'e1', {
          receiptFile: new File(['x'], 'r.jpg'),
          removeExistingReceipt: false,
          existingReceiptPath: null,
        }),
      ).rejects.toThrow('db down');
    });

    expect(mockDeleteReceipt).toHaveBeenCalledWith('new/p.jpg');
    expect(mockShowErrorToast).toHaveBeenCalled();
  });

  it('clears the path and deletes the file when the receipt is removed', async () => {
    mockDataService.updateExpense
      .mockResolvedValueOnce(
        makeExpense({ id: 'e1', receipt_path: 'old/p.jpg' }),
      )
      .mockResolvedValueOnce(makeExpense({ id: 'e1', receipt_path: null }));
    mockDeleteReceipt.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({} as never, 'e1', {
        receiptFile: null,
        removeExistingReceipt: true,
        existingReceiptPath: 'old/p.jpg',
      });
    });

    expect(mockUploadReceipt).not.toHaveBeenCalled();
    expect(mockDataService.updateExpense).toHaveBeenLastCalledWith(
      { receipt_path: null },
      'e1',
    );
    expect(mockDeleteReceipt).toHaveBeenCalledWith('old/p.jpg');
  });
});

// --- handleExpenseSubmit: offline + errors ---

describe('handleExpenseSubmit offline', () => {
  it('queues a create and shows an optimistic row with the temp id', async () => {
    offline = true;
    mockDataService.createExpense.mockRejectedValue(new Error('offline'));
    mockEnqueue.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit({
        amount: 9,
        extra_tag_ids: ['t1'],
      } as never);
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'createExpense',
      expect.objectContaining({ amount: 9, __tempId: 'temp-123' }),
    );

    const [optimistic] = applyLastSetExpenses([]);
    expect(optimistic.id).toBe('temp-123');
    // extra_tag_ids is write-only: it rides the queued payload, not the row.
    expect(optimistic).not.toHaveProperty('extra_tag_ids');
  });

  it('queues an update by id and patches the existing row', async () => {
    offline = true;
    mockDataService.updateExpense.mockRejectedValue(new Error('offline'));
    mockEnqueue.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSubmit(
        { description: 'Patched' } as never,
        'e1',
      );
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      'updateExpense',
      expect.objectContaining({ id: 'e1' }),
    );
    expect(
      applyLastSetExpenses([makeExpense({ id: 'e1' })])[0].description,
    ).toBe('Patched');
  });

  it('surfaces a retryable error toast and rethrows when genuinely failing', async () => {
    mockDataService.createExpense.mockRejectedValue(new Error('boom'));

    const ops = renderOps();
    await act(async () => {
      await expect(
        ops.current.handleExpenseSubmit({} as never),
      ).rejects.toThrow('boom');
    });

    expect(mockHaptics.error).toHaveBeenCalled();
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
    );
  });
});

// --- handleExpenseDelete ---

describe('handleExpenseDelete', () => {
  it('removes the row and cleans up its receipt and debt', async () => {
    expensesRef.current = [
      makeExpense({ id: 'e1', receipt_path: 'r/p.jpg', debt_id: 'd1' }),
    ];
    mockDataService.deleteExpense.mockResolvedValue(undefined);
    mockDeleteReceipt.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseDelete('e1');
    });

    expect(applyLastSetExpenses([makeExpense({ id: 'e1' })])).toEqual([]);
    expect(mockDeleteReceipt).toHaveBeenCalledWith('r/p.jpg');
    expect(mockRefreshDebts).toHaveBeenCalled();
  });

  it('queues the delete offline and still removes the row', async () => {
    offline = true;
    expensesRef.current = [makeExpense({ id: 'e1' })];
    mockDataService.deleteExpense.mockRejectedValue(new Error('offline'));
    mockEnqueue.mockResolvedValue(undefined);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseDelete('e1');
    });

    expect(mockEnqueue).toHaveBeenCalledWith('deleteExpense', { id: 'e1' });
    expect(applyLastSetExpenses([makeExpense({ id: 'e1' })])).toEqual([]);
  });
});

// --- handleExpenseSplit ---

describe('handleExpenseSplit', () => {
  it('writes the new parts before shrinking the original', async () => {
    const original = makeExpense({ id: 'e1', amount: 120 });
    const callOrder: string[] = [];
    mockDataService.createExpensesBulk.mockImplementation(async () => {
      callOrder.push('bulk');

      return [makeExpense({ id: 'p2', amount: 40 })];
    });
    mockDataService.updateExpense.mockImplementation(async () => {
      callOrder.push('update');

      return makeExpense({ id: 'e1', amount: 40 });
    });

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSplit(original, [
        { amount: 40, category_id: 'c1' },
        { amount: 80, category_id: 'c2' },
      ]);
    });

    // Insert first: a failure here leaves the original intact rather than
    // shrinking it and losing the remainder.
    expect(callOrder).toEqual(['bulk', 'update']);
    // The split parts are default-currency amounts, so the original's foreign
    // pairing must be cleared.
    expect(mockDataService.updateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        original_amount: null,
        original_currency: null,
        exchange_rate: null,
      }),
      'e1',
    );
  });

  it('resyncs from the server when a split fails part-way', async () => {
    mockDataService.createExpensesBulk.mockRejectedValue(new Error('nope'));

    const ops = renderOps();
    await act(async () => {
      await expect(
        ops.current.handleExpenseSplit(makeExpense(), [
          { amount: 1, category_id: null },
          { amount: 2, category_id: null },
        ]),
      ).rejects.toThrow('nope');
    });

    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  it('ignores a split with fewer than two parts', async () => {
    const ops = renderOps();
    await act(async () => {
      await ops.current.handleExpenseSplit(makeExpense(), [
        { amount: 1, category_id: null },
      ]);
    });

    expect(mockDataService.createExpensesBulk).not.toHaveBeenCalled();
  });
});
