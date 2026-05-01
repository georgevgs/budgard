import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { dataService } from './dataService';

// Build a chainable mock that captures the final call intent
const mockChain = (finalData: unknown = null, finalError: unknown = null) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'order',
    'single',
    'maybeSingle',
    'abortSignal',
  ];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  // The terminal awaited value
  chain.then = undefined as unknown as ReturnType<typeof vi.fn>;
  Object.defineProperty(chain, 'then', {
    value: (resolve: (val: unknown) => void) =>
      resolve({ data: finalData, error: finalError }),
  });
  return chain;
};

describe('dataService', () => {
  // --- getCategories ---
  it('fetches categories ordered by name', async () => {
    const chain = mockChain([{ id: 'c1', name: 'Food' }]);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getCategories();
    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(chain.order).toHaveBeenCalledWith('name');
    expect(result).toEqual([{ id: 'c1', name: 'Food' }]);
  });

  it('throws on category fetch error', async () => {
    const chain = mockChain(null, { message: 'fail' });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(dataService.getCategories()).rejects.toEqual({
      message: 'fail',
    });
  });

  it('passes abort signal when provided', async () => {
    const chain = mockChain([]);
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    const controller = new AbortController();

    await dataService.getCategories(controller.signal);
    expect(chain.abortSignal).toHaveBeenCalledWith(controller.signal);
  });

  // --- getTags ---
  it('fetches tags ordered by name', async () => {
    const chain = mockChain([{ id: 't1', name: 'Daily' }]);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getTags();
    expect(supabase.from).toHaveBeenCalledWith('tags');
    expect(result).toEqual([{ id: 't1', name: 'Daily' }]);
  });

  // --- createTag ---
  it('creates a tag and returns it', async () => {
    const tag = { id: 't1', name: 'Work', color: '#000' };
    const chain = mockChain(tag);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.createTag({ name: 'Work', color: '#000' });
    expect(chain.insert).toHaveBeenCalledWith({ name: 'Work', color: '#000' });
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual(tag);
  });

  // --- getExpenses ---
  it('fetches expenses with joins', async () => {
    const chain = mockChain([{ id: 'e1', amount: 10 }]);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getExpenses();
    expect(supabase.from).toHaveBeenCalledWith('expenses');
    expect(chain.select).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'e1', amount: 10 }]);
  });

  // --- createExpense ---
  it('creates an expense', async () => {
    const expense = { id: 'e1', amount: 50, description: 'Test' };
    const chain = mockChain(expense);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.createExpense({
      amount: 50,
      description: 'Test',
    });
    expect(chain.insert).toHaveBeenCalledWith({
      amount: 50,
      description: 'Test',
    });
    expect(result).toEqual(expense);
  });

  // --- updateExpense ---
  it('updates an expense by id', async () => {
    const updated = { id: 'e1', amount: 75 };
    const chain = mockChain(updated);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.updateExpense({ amount: 75 }, 'e1');
    expect(chain.update).toHaveBeenCalledWith({ amount: 75 });
    expect(chain.eq).toHaveBeenCalledWith('id', 'e1');
    expect(result).toEqual(updated);
  });

  // --- deleteExpense ---
  it('deletes an expense by id', async () => {
    const chain = mockChain(null, null);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await dataService.deleteExpense('e1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'e1');
  });

  // --- createExpensesBulk ---
  it('bulk creates expenses', async () => {
    const bulk = [{ id: 'e1' }, { id: 'e2' }];
    const chain = mockChain(bulk);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const data = [
      { date: '2026-01-01', description: 'A', amount: 10, category_id: null },
      { date: '2026-01-02', description: 'B', amount: 20, category_id: null },
    ];
    const result = await dataService.createExpensesBulk(data);
    expect(chain.insert).toHaveBeenCalledWith(data);
    expect(result).toEqual(bulk);
  });

  // --- createCategory ---
  it('creates a category', async () => {
    const cat = { id: 'c1', name: 'Food' };
    const chain = mockChain(cat);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.createCategory({
      name: 'Food',
      color: '#F00',
    });
    expect(chain.insert).toHaveBeenCalledWith({ name: 'Food', color: '#F00' });
    expect(result).toEqual(cat);
  });

  // --- updateCategory ---
  it('updates a category by id', async () => {
    const updated = { id: 'c1', name: 'Groceries', color: '#0F0' };
    const chain = mockChain(updated);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.updateCategory('c1', {
      name: 'Groceries',
      color: '#0F0',
    });
    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(chain.update).toHaveBeenCalledWith({
      name: 'Groceries',
      color: '#0F0',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'c1');
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it('throws on category update error', async () => {
    const chain = mockChain(null, { message: 'update failed' });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(
      dataService.updateCategory('c1', { name: 'Bad' }),
    ).rejects.toEqual({ message: 'update failed' });
  });

  // --- deleteCategory ---
  it('deletes a category by id', async () => {
    const chain = mockChain(null, null);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await dataService.deleteCategory('c1');
    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'c1');
  });

  it('throws on category delete error', async () => {
    const chain = mockChain(null, { message: 'delete failed' });
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await expect(dataService.deleteCategory('c1')).rejects.toEqual({
      message: 'delete failed',
    });
  });

  // --- getRecurringExpenses ---
  it('fetches recurring expenses with category join', async () => {
    const chain = mockChain([{ id: 'r1' }]);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getRecurringExpenses();
    expect(supabase.from).toHaveBeenCalledWith('recurring_expenses');
    expect(result).toEqual([{ id: 'r1' }]);
  });

  // --- createRecurringExpense ---
  it('creates a recurring expense', async () => {
    const rec = { id: 'r1', frequency: 'monthly' };
    const chain = mockChain(rec);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.createRecurringExpense({
      frequency: 'monthly',
    } as never);
    expect(chain.insert).toHaveBeenCalled();
    expect(result).toEqual(rec);
  });

  // --- updateRecurringExpense ---
  it('updates a recurring expense', async () => {
    const updated = { id: 'r1', active: false };
    const chain = mockChain(updated);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.updateRecurringExpense(
      { active: false } as never,
      'r1',
    );
    expect(chain.update).toHaveBeenCalledWith({ active: false });
    expect(chain.eq).toHaveBeenCalledWith('id', 'r1');
    expect(result).toEqual(updated);
  });

  // --- deleteRecurringExpense ---
  it('deletes a recurring expense', async () => {
    const chain = mockChain(null, null);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await dataService.deleteRecurringExpense('r1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'r1');
  });

  // --- toggleRecurringExpense ---
  it('toggles recurring expense active state', async () => {
    const toggled = { id: 'r1', active: true };
    const chain = mockChain(toggled);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.toggleRecurringExpense('r1', true);
    expect(chain.update).toHaveBeenCalledWith({ active: true });
    expect(result).toEqual(toggled);
  });

  // --- getBudget ---
  it('fetches user budget', async () => {
    const budget = { id: 'b1', monthly_amount: 2000 };
    const chain = mockChain(budget);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getBudget();
    expect(supabase.from).toHaveBeenCalledWith('user_budgets');
    expect(chain.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(budget);
  });

  it('returns null when no budget exists', async () => {
    const chain = mockChain(null);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getBudget();
    expect(result).toBeNull();
  });

  // --- upsertBudget ---
  it('upserts budget for current user', async () => {
    // Mock getUser
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);

    const budget = { id: 'b1', monthly_amount: 3000 };
    const chain = mockChain(budget);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.upsertBudget(3000);
    expect(chain.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', monthly_amount: 3000 },
      { onConflict: 'user_id' },
    );
    expect(result).toEqual(budget);
  });

  it('throws when upsertBudget called without authenticated user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    await expect(dataService.upsertBudget(1000)).rejects.toThrow(
      'Not authenticated',
    );
  });

  // --- getUser ---
  it('returns the current authenticated user', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    } as never);

    const user = await dataService.getUser();
    expect(user).toEqual({ id: 'user-1', email: 'test@test.com' });
  });

  // --- processRecurringExpenses ---
  it('calls edge function with auth token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'my-token' } },
    } as never);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, generated_count: 2 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dataService.processRecurringExpenses('2026-03-15');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('process-recurring-expenses'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
    expect(result.success).toBe(true);

    vi.unstubAllGlobals();
  });

  it('throws when not authenticated for processRecurringExpenses', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);

    await expect(dataService.processRecurringExpenses()).rejects.toThrow(
      'Not authenticated',
    );
  });

  it('throws on edge function error response', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    } as never);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Processing failed' }),
      }),
    );

    await expect(dataService.processRecurringExpenses()).rejects.toThrow(
      'Processing failed',
    );
    vi.unstubAllGlobals();
  });

  it('throws when getUser fails', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'not authenticated' },
    } as never);

    await expect(dataService.getUser()).rejects.toEqual({
      message: 'not authenticated',
    });
  });

  // --- deleteAccount ---
  it('calls the delete-account edge function with the auth token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt-abc' } },
    } as never);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await dataService.deleteAccount();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/delete-account'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-abc',
        }),
      }),
    );
    expect(result).toEqual({ success: true });

    vi.unstubAllGlobals();
  });

  it('throws when deleteAccount called without a session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);

    await expect(dataService.deleteAccount()).rejects.toThrow(
      'Not authenticated',
    );
  });

  it('surfaces the edge function error message on failure', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    } as never);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      }),
    );

    await expect(dataService.deleteAccount()).rejects.toThrow('Unauthorized');
    vi.unstubAllGlobals();
  });

  // --- getDebts ---
  it('fetches active (non-archived) debts ordered by created_at', async () => {
    const debts = [{ id: 'd1', name: 'Card' }];
    const chain = mockChain(debts);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getDebts();
    expect(supabase.from).toHaveBeenCalledWith('debts');
    expect(chain.eq).toHaveBeenCalledWith('is_archived', false);
    expect(chain.order).toHaveBeenCalledWith('created_at', {
      ascending: true,
    });
    expect(result).toEqual(debts);
  });

  // --- createDebt ---
  it('creates a debt mirroring current_balance into original_principal', async () => {
    const created = {
      id: 'd1',
      name: 'Card',
      current_balance: 5000,
      original_principal: 5000,
    };
    const chain = mockChain(created);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.createDebt({
      name: 'Card',
      kind: 'credit_card',
      current_balance: 5000,
      apr: 18,
      minimum_payment: 150,
      currency: 'EUR',
      icon: 'credit-card',
      color: '#f97316',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_balance: 5000,
        original_principal: 5000,
      }),
    );
    expect(result).toEqual(created);
  });

  // --- updateDebt ---
  it('strips immutable fields on debt update', async () => {
    const updated = { id: 'd1', name: 'Renamed' };
    const chain = mockChain(updated);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    await dataService.updateDebt('d1', {
      name: 'Renamed',
      user_id: 'shouldnt-leak',
      id: 'shouldnt-leak',
      created_at: 'shouldnt-leak',
    });

    const updatePayload = chain.update.mock.calls[0][0];
    expect(updatePayload).toEqual({ name: 'Renamed' });
    expect(updatePayload).not.toHaveProperty('user_id');
    expect(updatePayload).not.toHaveProperty('id');
    expect(updatePayload).not.toHaveProperty('created_at');
    expect(chain.eq).toHaveBeenCalledWith('id', 'd1');
  });

  // --- archiveDebt ---
  it('archives a debt by setting is_archived=true', async () => {
    const archived = { id: 'd1', is_archived: true };
    const chain = mockChain(archived);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.archiveDebt('d1');
    expect(chain.update).toHaveBeenCalledWith({ is_archived: true });
    expect(chain.eq).toHaveBeenCalledWith('id', 'd1');
    expect(result).toEqual(archived);
  });

  // --- getDebtPayments ---
  it('fetches expenses linked to a debt with category join', async () => {
    const payments = [{ id: 'e1', amount: 100, debt_id: 'd1' }];
    const chain = mockChain(payments);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getDebtPayments('d1');
    expect(supabase.from).toHaveBeenCalledWith('expenses');
    expect(chain.eq).toHaveBeenCalledWith('debt_id', 'd1');
    expect(result).toEqual(payments);
  });

  // --- getDebtById ---
  it('fetches a single debt by id', async () => {
    const debt = { id: 'd1', name: 'Card' };
    const chain = mockChain(debt);
    vi.mocked(supabase.from).mockReturnValue(chain as never);

    const result = await dataService.getDebtById('d1');
    expect(chain.eq).toHaveBeenCalledWith('id', 'd1');
    expect(chain.single).toHaveBeenCalled();
    expect(result).toEqual(debt);
  });
});
