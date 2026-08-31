// Second shared-mock suite, covering the slices that fan out beyond their own
// list: accounts (balances), categories (embedded in expenses and incomes),
// budgets, settings scalars, and the two recurring rules.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Category } from '@/types/Category';

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockShowErrorToast = vi.fn();
vi.mock('@/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => mockShowErrorToast,
}));

const mockHaptics = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  selection: vi.fn(),
}));
vi.mock('@/lib/haptics', () => ({ haptics: mockHaptics }));

const mockSentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@/lib/sentry', () => mockSentry);

const mockSignOut = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ signOut: mockSignOut }));

const svc = vi.hoisted(() => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  archiveAccount: vi.fn(),
  getAccountById: vi.fn(),
  upsertAccountBalance: vi.fn(),
  deleteAccountBalance: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  mergeCategory: vi.fn(),
  upsertBudget: vi.fn(),
  upsertCategoryBudget: vi.fn(),
  deleteCategoryBudget: vi.fn(),
  updateDefaultCurrency: vi.fn(),
  updateDailyReminderHour: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  updateDefaultSavingsPct: vi.fn(),
  deleteAccount: vi.fn(),
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
  toggleRecurringExpense: vi.fn(),
  createRecurringIncome: vi.fn(),
  deleteRecurringIncome: vi.fn(),
  toggleRecurringIncome: vi.fn(),
}));
vi.mock('@/services/dataService', () => ({ dataService: svc }));

const store = vi.hoisted(() => ({
  accounts: [] as unknown[],
  accountBalances: [] as unknown[],
  categories: [] as unknown[],
  expenses: [] as unknown[],
  incomes: [] as unknown[],
  categoryBudgets: [] as unknown[],
  recurringExpenses: [] as unknown[],
  recurringIncomes: [] as unknown[],
  scalars: {} as Record<string, unknown>,
}));

const mockRefreshExpenses = vi.hoisted(() => vi.fn());
const mockRefreshAccounts = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockRefreshIncomes = vi.hoisted(() => vi.fn(() => Promise.resolve()));

const listSetter = (key: keyof typeof store) => (arg: unknown) => {
  if (typeof arg === 'function') {
    store[key] = (arg as (p: unknown[]) => unknown[])(
      store[key] as unknown[],
    ) as never;

    return;
  }
  store[key] = arg as never;
};

const scalarSetter = (name: string) => (value: unknown) => {
  store.scalars[name] = value;
};

vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({
    isInitialized: true,
    monthlyBudget: 1000,
    defaultCurrency: 'EUR',
    defaultSavingsPct: 10,
    dailyReminderHour: 9,
    notificationPreferences: { billDue: true },
  }),
  useDataActions: () => ({
    setAccounts: listSetter('accounts'),
    setAccountBalances: listSetter('accountBalances'),
    setCategories: listSetter('categories'),
    setExpenses: listSetter('expenses'),
    setIncomes: listSetter('incomes'),
    setCategoryBudgets: listSetter('categoryBudgets'),
    setRecurringExpenses: listSetter('recurringExpenses'),
    setRecurringIncomes: listSetter('recurringIncomes'),
    setMonthlyBudget: scalarSetter('monthlyBudget'),
    setDefaultCurrency: scalarSetter('defaultCurrency'),
    setDefaultSavingsPct: scalarSetter('defaultSavingsPct'),
    setDailyReminderHour: scalarSetter('dailyReminderHour'),
    setNotificationPreferences: scalarSetter('notificationPreferences'),
    refreshExpenses: mockRefreshExpenses,
    refreshAccounts: mockRefreshAccounts,
    refreshIncomes: mockRefreshIncomes,
  }),
}));

import { useAccountOps } from '@/hooks/dataOps/useAccountOps';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useSettingsOps } from '@/hooks/dataOps/useSettingsOps';
import { useRecurringExpenseOps } from '@/hooks/dataOps/useRecurringExpenseOps';
import { useRecurringIncomeOps } from '@/hooks/dataOps/useRecurringIncomeOps';

beforeEach(() => {
  vi.clearAllMocks();
  store.accounts = [];
  store.accountBalances = [];
  store.categories = [];
  store.expenses = [];
  store.incomes = [];
  store.categoryBudgets = [];
  store.recurringExpenses = [];
  store.recurringIncomes = [];
  store.scalars = {};
  mockRefreshAccounts.mockResolvedValue(undefined);
  mockRefreshIncomes.mockResolvedValue(undefined);
});

// --- Accounts ---

describe('useAccountOps', () => {
  it('appends a new account and refetches to pick up its opening balance', async () => {
    store.accounts = [{ id: 'a1' }];
    svc.createAccount.mockResolvedValue({ id: 'a2' });

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await ops.current.handleAccountSubmit({ name: 'Savings' });
    });

    expect((store.accounts as { id: string }[]).map((a) => a.id)).toEqual([
      'a1',
      'a2',
    ]);
    expect(mockRefreshAccounts).toHaveBeenCalled();
  });

  it('does not refetch accounts on a plain edit', async () => {
    store.accounts = [{ id: 'a1', name: 'Old' }];
    svc.updateAccount.mockResolvedValue({ id: 'a1', name: 'New' });

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await ops.current.handleAccountSubmit({ name: 'New' }, 'a1');
    });

    expect((store.accounts as { name: string }[])[0].name).toBe('New');
    expect(mockRefreshAccounts).not.toHaveBeenCalled();
  });

  it('restores the account when archiving fails', async () => {
    const before = [{ id: 'a1' }, { id: 'a2' }];
    store.accounts = [...before];
    svc.archiveAccount.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await expect(ops.current.handleAccountArchive('a1')).rejects.toThrow();
    });

    expect(store.accounts).toEqual(before);
  });

  it('buzzes on the snapshot landing, before the account refetch resolves', async () => {
    // The user should feel the save immediately, not a round-trip later.
    const order: string[] = [];
    store.accounts = [{ id: 'a1', balance: 0 }];
    mockHaptics.success.mockImplementation(() => order.push('haptic'));
    svc.upsertAccountBalance.mockResolvedValue({
      id: 'b1',
      account_id: 'a1',
      recorded_at: '2026-08-01',
    });
    svc.getAccountById.mockImplementation(async () => {
      order.push('refetch');

      return { id: 'a1', balance: 500 };
    });

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await ops.current.handleSnapshotCreate({ account_id: 'a1' });
    });

    expect(order).toEqual(['haptic', 'refetch']);
    expect((store.accounts as { balance: number }[])[0]?.balance).toBe(500);
  });

  it('keeps snapshots sorted by date and replaces a same-day entry', async () => {
    store.accountBalances = [
      { id: 'old', account_id: 'a1', recorded_at: '2026-08-01' },
      { id: 'later', account_id: 'a1', recorded_at: '2026-09-01' },
    ];
    svc.upsertAccountBalance.mockResolvedValue({
      id: 'new',
      account_id: 'a1',
      recorded_at: '2026-08-01',
    });
    svc.getAccountById.mockResolvedValue({ id: 'a1' });

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await ops.current.handleSnapshotCreate({ account_id: 'a1' });
    });

    expect(
      (store.accountBalances as { id: string; recorded_at: string }[]).map(
        (b) => b.id,
      ),
    ).toEqual(['new', 'later']);
  });

  it('restores the snapshot when its delete fails', async () => {
    const before = [{ id: 'b1', account_id: 'a1', recorded_at: '2026-08-01' }];
    store.accountBalances = [...before];
    svc.deleteAccountBalance.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useAccountOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleSnapshotDelete('b1', 'a1'),
      ).rejects.toThrow();
    });

    expect(store.accountBalances).toEqual(before);
  });
});

// --- Categories ---

describe('useCategoryOps', () => {
  it('sorts the category list once the server row arrives', async () => {
    store.categories = [{ id: 'a', name: 'Apple' }, { id: 'z', name: 'Zebra' }];
    svc.createCategory.mockResolvedValue({ id: 'm', name: 'Mango' });

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await ops.current.handleCategoryAdd({ name: 'Mango' });
    });

    expect((store.categories as { name: string }[]).map((c) => c.name)).toEqual(
      ['Apple', 'Mango', 'Zebra'],
    );
  });

  it('renames the category inside expense and income rows too', async () => {
    store.categories = [{ id: 'c1', name: 'Old' }];
    store.expenses = [{ id: 'e1', category_id: 'c1', category: { id: 'c1', name: 'Old' } }];
    store.incomes = [{ id: 'i1', category_id: 'c1', category: { id: 'c1', name: 'Old' } }];
    svc.updateCategory.mockResolvedValue({ id: 'c1', name: 'New' });

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await ops.current.handleCategoryUpdate('c1', { name: 'New' });
    });

    expect((store.expenses as { category: { name: string } }[])[0].category.name).toBe('New');
    expect((store.incomes as { category: { name: string } }[])[0].category.name).toBe('New');
  });

  it('restores categories, expenses and incomes together when the edit fails', async () => {
    const cats = [{ id: 'c1', name: 'Old' }];
    const exps = [{ id: 'e1', category_id: 'c1', category: { id: 'c1', name: 'Old' } }];
    const incs = [{ id: 'i1', category_id: 'c1', category: { id: 'c1', name: 'Old' } }];
    store.categories = [...cats];
    store.expenses = [...exps];
    store.incomes = [...incs];
    svc.updateCategory.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleCategoryUpdate('c1', { name: 'New' }),
      ).rejects.toThrow();
    });

    expect(store.categories).toEqual(cats);
    expect(store.expenses).toEqual(exps);
    expect(store.incomes).toEqual(incs);
  });

  it('drops the category and its budget, and resyncs expenses and incomes on failure', async () => {
    store.categories = [{ id: 'c1', name: 'Gone' }];
    store.categoryBudgets = [{ id: 'b1', category_id: 'c1' }];
    store.expenses = [{ id: 'e1', category_id: 'c1', category: { id: 'c1' } }];
    svc.deleteCategory.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await expect(ops.current.handleCategoryDelete('c1')).rejects.toThrow();
    });

    expect(store.categories).toHaveLength(1);
    expect(store.categoryBudgets).toHaveLength(1);
    // The stripped embeds cannot be rebuilt locally, so they are refetched —
    // an income category strips income rows, so both slices are covered.
    expect(mockRefreshExpenses).toHaveBeenCalled();
    expect(mockRefreshIncomes).toHaveBeenCalled();
  });

  it('clears the category out of expense and income rows alike on delete', async () => {
    store.categories = [{ id: 'c1', name: 'Gone' }];
    store.expenses = [{ id: 'e1', category_id: 'c1', category: { id: 'c1' } }];
    store.incomes = [{ id: 'i1', category_id: 'c1', category: { id: 'c1' } }];
    svc.deleteCategory.mockResolvedValue(undefined);

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await ops.current.handleCategoryDelete('c1');
    });

    expect((store.expenses as { category_id?: string }[])[0].category_id).toBeUndefined();
    expect((store.incomes as { category_id?: string }[])[0].category_id).toBeUndefined();
  });

  it('folds expenses and incomes into the destination category, then drops the source', async () => {
    const destination = { id: 'c2', name: 'Food' } as Category;
    store.categories = [{ id: 'c1', name: 'Dining' }, destination];
    store.categoryBudgets = [{ id: 'b1', category_id: 'c1' }];
    store.expenses = [{ id: 'e1', category_id: 'c1', category: { id: 'c1' } }];
    store.incomes = [{ id: 'i1', category_id: 'c1', category: { id: 'c1' } }];
    svc.mergeCategory.mockResolvedValue(1);

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await ops.current.handleCategoryMerge('c1', destination);
    });

    expect((store.categories as { id: string }[]).map((c) => c.id)).toEqual(['c2']);
    expect(store.categoryBudgets).toHaveLength(0);
    expect((store.expenses as { category_id: string }[])[0].category_id).toBe('c2');
    expect((store.incomes as { category_id: string }[])[0].category_id).toBe('c2');
    expect(svc.mergeCategory).toHaveBeenCalledWith('c1', 'c2');
  });

  it('restores categories, expenses, incomes and budgets when a merge fails', async () => {
    const destination = { id: 'c2', name: 'Food' } as Category;
    const cats = [{ id: 'c1', name: 'Dining' }, destination];
    const budgets = [{ id: 'b1', category_id: 'c1' }];
    const exps = [{ id: 'e1', category_id: 'c1', category: { id: 'c1' } }];
    const incs = [{ id: 'i1', category_id: 'c1', category: { id: 'c1' } }];
    store.categories = [...cats];
    store.categoryBudgets = [...budgets];
    store.expenses = [...exps];
    store.incomes = [...incs];
    svc.mergeCategory.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useCategoryOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleCategoryMerge('c1', destination),
      ).rejects.toThrow();
    });

    expect(store.categories).toEqual(cats);
    expect(store.categoryBudgets).toEqual(budgets);
    expect(store.expenses).toEqual(exps);
    expect(store.incomes).toEqual(incs);
  });
});

// --- Budgets ---

describe('useBudgetOps', () => {
  it('shows the new budget at once and restores it on failure', async () => {
    svc.upsertBudget.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useBudgetOps()).result;
    await act(async () => {
      await expect(ops.current.handleBudgetUpdate(2000)).rejects.toThrow();
    });

    // Back to the value from context.
    expect(store.scalars.monthlyBudget).toBe(1000);
    // Silent: the figure moving on screen is the confirmation.
    expect(mockHaptics.success).not.toHaveBeenCalled();
  });

  it('bumps an existing cap rather than adding a second row', async () => {
    store.categoryBudgets = [
      { id: 'b1', category_id: 'c1', monthly_amount: 100 },
    ];
    svc.upsertCategoryBudget.mockResolvedValue({
      id: 'b1',
      category_id: 'c1',
      monthly_amount: 250,
    });

    const ops = renderHook(() => useBudgetOps()).result;
    await act(async () => {
      await ops.current.handleCategoryBudgetUpsert('c1', 250);
    });

    expect(store.categoryBudgets).toHaveLength(1);
    expect(
      (store.categoryBudgets as { monthly_amount: number }[])[0].monthly_amount,
    ).toBe(250);
  });

  it('restores the caps when removing one fails', async () => {
    const before = [{ id: 'b1', category_id: 'c1', monthly_amount: 100 }];
    store.categoryBudgets = [...before];
    svc.deleteCategoryBudget.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useBudgetOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleCategoryBudgetDelete('c1'),
      ).rejects.toThrow();
    });

    expect(store.categoryBudgets).toEqual(before);
  });
});

// --- Settings ---

describe('useSettingsOps', () => {
  it('applies a setting immediately and reverts it if the save fails', async () => {
    svc.updateDefaultCurrency.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useSettingsOps()).result;
    await act(async () => {
      await expect(ops.current.handleCurrencyUpdate('USD')).rejects.toThrow();
    });

    expect(store.scalars.defaultCurrency).toBe('EUR');
  });

  it('merges a single notification preference rather than replacing the set', async () => {
    svc.updateNotificationPreferences.mockResolvedValue(undefined);

    const ops = renderHook(() => useSettingsOps()).result;
    await act(async () => {
      await ops.current.handleNotificationPreferenceUpdate(
        'weeklyRecap' as never,
        true,
      );
    });

    expect(store.scalars.notificationPreferences).toEqual({
      billDue: true,
      weeklyRecap: true,
    });
  });

  it('signs out after the account is deleted', async () => {
    svc.deleteAccount.mockResolvedValue(undefined);

    const ops = renderHook(() => useSettingsOps()).result;
    await act(async () => {
      await ops.current.handleDeleteAccount();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('offers no retry when deleting the account fails', async () => {
    // Re-running an account deletion on a tap is not a kindness.
    svc.deleteAccount.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useSettingsOps()).result;
    await act(async () => {
      await expect(ops.current.handleDeleteAccount()).rejects.toThrow();
    });

    expect(mockShowErrorToast).toHaveBeenCalledWith(expect.any(String));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// --- Recurring rules ---

describe('useRecurringExpenseOps', () => {
  it('prepends a new rule and resyncs the ledger after a delete', async () => {
    svc.createRecurringExpense.mockResolvedValue({ id: 'r1' });

    const ops = renderHook(() => useRecurringExpenseOps()).result;
    await act(async () => {
      await ops.current.handleRecurringExpenseSubmit({ description: 'Rent' });
    });
    expect(store.recurringExpenses).toEqual([{ id: 'r1' }]);

    store.recurringExpenses = [{ id: 'r1' }];
    svc.deleteRecurringExpense.mockResolvedValue(undefined);
    mockRefreshExpenses.mockResolvedValue(undefined);
    await act(async () => {
      await ops.current.handleRecurringExpenseDelete('r1');
    });

    expect(store.recurringExpenses).toEqual([]);
    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  it('flips the toggle back on failure instead of restoring the whole list', async () => {
    store.recurringExpenses = [{ id: 'r1', active: true }];
    svc.toggleRecurringExpense.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useRecurringExpenseOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleRecurringExpenseToggle('r1', false),
      ).rejects.toThrow();
    });

    expect((store.recurringExpenses as { active: boolean }[])[0].active).toBe(
      true,
    );
  });
});

describe('useRecurringIncomeOps', () => {
  it('mirrors the expense rule behaviour on its own slice', async () => {
    svc.createRecurringIncome.mockResolvedValue({ id: 'ri1' });

    const ops = renderHook(() => useRecurringIncomeOps()).result;
    await act(async () => {
      await ops.current.handleRecurringIncomeSubmit({ description: 'Salary' });
    });

    expect(store.recurringIncomes).toEqual([{ id: 'ri1' }]);
    // The expense slice must not be touched by an income rule.
    expect(store.recurringExpenses).toEqual([]);
  });

  it('restores the income rule when its delete fails', async () => {
    const before = [{ id: 'ri1' }];
    store.recurringIncomes = [...before];
    svc.deleteRecurringIncome.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useRecurringIncomeOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleRecurringIncomeDelete('ri1'),
      ).rejects.toThrow();
    });

    expect(store.recurringIncomes).toEqual(before);
  });
});
