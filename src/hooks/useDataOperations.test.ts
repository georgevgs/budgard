import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataOperations } from './useDataOperations';

// Mock useData context
const mockSetExpenses = vi.fn((updater) => {
  if (typeof updater === 'function') updater([]);
});
const mockSetCategories = vi.fn((updater) => {
  if (typeof updater === 'function') updater([]);
});
const mockSetTags = vi.fn((updater) => {
  if (typeof updater === 'function') updater([]);
});
const mockSetRecurringExpenses = vi.fn((updater) => {
  if (typeof updater === 'function') updater([]);
});
const mockRefreshExpenses = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/DataContext', () => ({
  useData: () => ({
    isInitialized: true,
    setExpenses: mockSetExpenses,
    setCategories: mockSetCategories,
    setTags: mockSetTags,
    setRecurringExpenses: mockSetRecurringExpenses,
    refreshExpenses: mockRefreshExpenses,
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock haptics
vi.mock('@/lib/haptics', () => ({
  haptics: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// Mock services
const mockCreateExpense = vi.fn();
const mockUpdateExpense = vi.fn();
const mockDeleteExpense = vi.fn();
const mockCreateCategory = vi.fn();
const mockCreateTag = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockCreateRecurring = vi.fn();
const mockUpdateRecurring = vi.fn();
const mockDeleteRecurring = vi.fn();
const mockToggleRecurring = vi.fn();
const mockDeleteAccount = vi.fn();

vi.mock('@/services/dataService', () => ({
  dataService: {
    createExpense: (...args: unknown[]) => mockCreateExpense(...args),
    updateExpense: (...args: unknown[]) => mockUpdateExpense(...args),
    deleteExpense: (...args: unknown[]) => mockDeleteExpense(...args),
    createCategory: (...args: unknown[]) => mockCreateCategory(...args),
    updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
    deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
    createTag: (...args: unknown[]) => mockCreateTag(...args),
    createRecurringExpense: (...args: unknown[]) =>
      mockCreateRecurring(...args),
    updateRecurringExpense: (...args: unknown[]) =>
      mockUpdateRecurring(...args),
    deleteRecurringExpense: (...args: unknown[]) =>
      mockDeleteRecurring(...args),
    toggleRecurringExpense: (...args: unknown[]) =>
      mockToggleRecurring(...args),
    deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
  },
}));

const mockSignOut = vi.fn();
vi.mock('@/lib/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('@/services/receiptService', () => ({
  uploadReceipt: vi.fn().mockResolvedValue('path/receipt.webp'),
  deleteReceipt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/offlineQueue', () => ({
  offlineQueue: { enqueue: vi.fn().mockResolvedValue(undefined) },
}));

describe('useDataOperations', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  // --- Expense Submit ---
  it('creates a new expense and updates state', async () => {
    const saved = { id: 'e1', amount: 50, receipt_path: null };
    mockCreateExpense.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleExpenseSubmit({ amount: 50 });
    });

    expect(mockCreateExpense).toHaveBeenCalledWith({ amount: 50 });
    expect(mockSetExpenses).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
  });

  it('updates an existing expense when id is provided', async () => {
    const saved = { id: 'e1', amount: 75, receipt_path: null };
    mockUpdateExpense.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleExpenseSubmit({ amount: 75 }, 'e1');
    });

    expect(mockUpdateExpense).toHaveBeenCalledWith({ amount: 75 }, 'e1');
  });

  it('queues expense offline when not connected', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    mockCreateExpense.mockRejectedValue(new Error('Network error'));

    const { offlineQueue } = await import('@/lib/offlineQueue');
    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleExpenseSubmit({ amount: 50 });
    });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('createExpense', {
      amount: 50,
    });
  });

  // --- Expense Delete ---
  it('deletes an expense', async () => {
    mockDeleteExpense.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleExpenseDelete('e1');
    });

    expect(mockDeleteExpense).toHaveBeenCalledWith('e1');
    expect(mockSetExpenses).toHaveBeenCalled();
  });

  it('queues delete offline when not connected', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    mockDeleteExpense.mockRejectedValue(new Error('Network'));

    const { offlineQueue } = await import('@/lib/offlineQueue');
    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleExpenseDelete('e1');
    });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('deleteExpense', {
      id: 'e1',
    });
  });

  // --- Category Add ---
  it('adds a category with optimistic update', async () => {
    const saved = { id: 'c1', name: 'Food', color: '#F00' };
    mockCreateCategory.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleCategoryAdd({ name: 'Food', color: '#F00' });
    });

    // Optimistic add + replace with server value
    expect(mockSetCategories).toHaveBeenCalledTimes(2);
    expect(mockCreateCategory).toHaveBeenCalled();
  });

  it('rolls back category on failure', async () => {
    mockCreateCategory.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleCategoryAdd({ name: 'Bad', color: '#000' });
      }),
    ).rejects.toThrow();

    // Optimistic add + rollback
    expect(mockSetCategories).toHaveBeenCalledTimes(2);
  });

  // --- Category Update ---
  it('updates a category with optimistic update and sorts by name', async () => {
    const saved = {
      id: 'c1',
      name: 'Groceries',
      color: '#0F0',
      icon: null,
      user_id: 'u1',
      created_at: '',
    };
    mockUpdateCategory.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleCategoryUpdate('c1', {
        name: 'Groceries',
        color: '#0F0',
      });
    });

    expect(mockUpdateCategory).toHaveBeenCalledWith('c1', {
      name: 'Groceries',
      color: '#0F0',
    });
    // Optimistic update + server confirm
    expect(mockSetCategories).toHaveBeenCalledTimes(2);
  });

  it('rolls back category update on failure', async () => {
    mockUpdateCategory.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleCategoryUpdate('c1', { name: 'Bad' });
      }),
    ).rejects.toThrow();

    // Optimistic update + rollback
    expect(mockSetCategories).toHaveBeenCalledTimes(2);
  });

  // --- Category Delete ---
  it('deletes a category and nulls out affected expenses', async () => {
    mockDeleteCategory.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleCategoryDelete('c1');
    });

    expect(mockDeleteCategory).toHaveBeenCalledWith('c1');
    expect(mockSetCategories).toHaveBeenCalled();
    expect(mockSetExpenses).toHaveBeenCalled();
  });

  it('rolls back category delete on failure and refreshes expenses', async () => {
    mockDeleteCategory.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleCategoryDelete('c1');
      }),
    ).rejects.toThrow();

    // Rollback categories and refresh expenses
    expect(mockSetCategories).toHaveBeenCalledTimes(2);
    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  // --- Tag Create ---
  it('creates a tag with optimistic update', async () => {
    const saved = {
      id: 't1',
      name: 'Work',
      color: '#00F',
      user_id: 'u1',
      created_at: '',
    };
    mockCreateTag.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    let tag;
    await act(async () => {
      tag = await result.current.handleTagCreate('Work', '#00F');
    });

    expect(tag).toEqual(saved);
    expect(mockSetTags).toHaveBeenCalledTimes(2);
  });

  it('rolls back tag on failure', async () => {
    mockCreateTag.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleTagCreate('Bad', '#000');
      }),
    ).rejects.toThrow();

    expect(mockSetTags).toHaveBeenCalledTimes(2);
  });

  // --- Recurring Expense Submit ---
  it('creates a recurring expense', async () => {
    const saved = { id: 'r1', frequency: 'monthly' };
    mockCreateRecurring.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleRecurringExpenseSubmit({
        frequency: 'monthly',
      });
    });

    expect(mockCreateRecurring).toHaveBeenCalled();
    expect(mockSetRecurringExpenses).toHaveBeenCalled();
  });

  it('updates a recurring expense when id provided', async () => {
    const saved = { id: 'r1', active: false };
    mockUpdateRecurring.mockResolvedValue(saved);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleRecurringExpenseSubmit(
        { active: false },
        'r1',
      );
    });

    expect(mockUpdateRecurring).toHaveBeenCalledWith({ active: false }, 'r1');
  });

  // --- Recurring Expense Delete ---
  it('deletes a recurring expense with optimistic removal', async () => {
    mockDeleteRecurring.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleRecurringExpenseDelete('r1');
    });

    expect(mockSetRecurringExpenses).toHaveBeenCalled();
    expect(mockDeleteRecurring).toHaveBeenCalledWith('r1');
    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  it('rolls back and refreshes on recurring delete failure', async () => {
    mockDeleteRecurring.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleRecurringExpenseDelete('r1');
      }),
    ).rejects.toThrow();

    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  // --- Recurring Expense Toggle ---
  it('toggles recurring expense active state', async () => {
    const toggled = { id: 'r1', active: true };
    mockToggleRecurring.mockResolvedValue(toggled);

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleRecurringExpenseToggle('r1', true);
    });

    expect(mockToggleRecurring).toHaveBeenCalledWith('r1', true);
    // Optimistic + server confirm
    expect(mockSetRecurringExpenses).toHaveBeenCalledTimes(2);
  });

  it('rolls back toggle on failure', async () => {
    mockToggleRecurring.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleRecurringExpenseToggle('r1', true);
      }),
    ).rejects.toThrow();

    // Optimistic + rollback
    expect(mockSetRecurringExpenses).toHaveBeenCalledTimes(2);
  });

  // --- Delete Account ---
  it('signs out after a successful account delete so the route guard redirects', async () => {
    mockDeleteAccount.mockResolvedValue({ success: true });
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDataOperations());

    await act(async () => {
      await result.current.handleDeleteAccount();
    });

    expect(mockDeleteAccount).toHaveBeenCalledOnce();
    expect(mockSignOut).toHaveBeenCalledOnce();
    // signOut must run after deleteAccount, otherwise the JWT would be cleared
    // before the edge function got to use it.
    const deleteOrder = mockDeleteAccount.mock.invocationCallOrder[0];
    const signOutOrder = mockSignOut.mock.invocationCallOrder[0];
    expect(signOutOrder).toBeGreaterThan(deleteOrder);
  });

  it('does not sign out if account deletion fails', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('Failed to delete account'));

    const { result } = renderHook(() => useDataOperations());

    await expect(
      act(async () => {
        await result.current.handleDeleteAccount();
      }),
    ).rejects.toThrow('Failed to delete account');

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
