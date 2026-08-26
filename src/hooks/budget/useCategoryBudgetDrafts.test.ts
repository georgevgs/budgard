import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockToast = vi.hoisted(() => vi.fn());

const mockT = vi.hoisted(() => vi.fn((key: string) => key));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

const ops = vi.hoisted(() => ({
  handleCategoryBudgetUpsert: vi.fn(),
  handleCategoryBudgetDelete: vi.fn(),
}));
vi.mock('@/hooks/dataOps/useBudgetOps', () => ({ useBudgetOps: () => ops }));

const data = vi.hoisted(() => ({
  expenseCategories: [] as unknown[],
  categoryBudgets: [] as unknown[],
}));

vi.mock('@/contexts/DataContext', () => ({
  useCategoriesData: () => ({ expenseCategories: data.expenseCategories }),
  useCategoryBudgetsData: () => data.categoryBudgets,
  useDataConfig: () => ({ defaultCurrency: 'EUR', monthlyBudget: 2000 }),
}));

import { useCategoryBudgetDrafts } from '@/hooks/budget/useCategoryBudgetDrafts';

// --- Fixtures ---

const cat = (id: string, name: string) => ({ id, name, type: 'expense' });
const budget = (categoryId: string, amount: number) => ({
  id: `b-${categoryId}`,
  category_id: categoryId,
  monthly_amount: amount,
});

const onClose = vi.fn();
const render = (isOpen = true) =>
  renderHook(() => useCategoryBudgetDrafts(isOpen, onClose)).result;

beforeEach(() => {
  vi.clearAllMocks();
  data.expenseCategories = [cat('c1', 'Zebra'), cat('c2', 'Apple')];
  data.categoryBudgets = [];
  ops.handleCategoryBudgetUpsert.mockResolvedValue(undefined);
  ops.handleCategoryBudgetDelete.mockResolvedValue(undefined);
});

describe('opening the sheet', () => {
  it('seeds drafts from the saved caps', () => {
    data.categoryBudgets = [budget('c1', 150)];
    const r = render();

    expect(r.current.drafts.c1).toContain('150');
    expect(r.current.drafts.c2).toBe('');
  });

  it('sorts categories by name, not by id order', () => {
    expect(render().current.sortedCategories.map((c) => c.name)).toEqual([
      'Apple',
      'Zebra',
    ]);
  });

  it('seeds even when it mounts already open, so Save cannot wipe the caps', () => {
    // The manager is currently always mounted and starts closed, so the
    // false->true transition seeds. If it ever becomes `{isOpen && <Manager/>}`
    // the hook mounts open — and an unseeded draft against an existing cap
    // reads as "cleared", which would delete every cap on Save.
    data.categoryBudgets = [budget('c1', 150), budget('c2', 80)];

    const r = render(true);

    expect(r.current.drafts.c1).toContain('150');
    expect(r.current.drafts.c2).toContain('80');
  });

  it('seeds nothing while closed', () => {
    expect(render(false).current.drafts).toEqual({});
  });
});

describe('totals', () => {
  it('counts only categories with a positive cap', () => {
    const r = render();

    act(() => r.current.updateDraft('c1', '100'));
    act(() => r.current.updateDraft('c2', '50'));

    expect(r.current.totals).toEqual({ allocated: 150, withCap: 2, total: 2 });
  });

  it('ignores a cleared cap', () => {
    data.categoryBudgets = [budget('c1', 150)];
    const r = render();

    act(() => r.current.clearDraft('c1'));

    expect(r.current.totals.allocated).toBe(0);
    expect(r.current.totals.withCap).toBe(0);
    // `total` stays the number of categories, capped or not.
    expect(r.current.totals.total).toBe(2);
  });
});

describe('saving', () => {
  it('writes only what actually changed', async () => {
    data.categoryBudgets = [budget('c1', 150), budget('c2', 80)];
    const r = render();

    act(() => r.current.updateDraft('c1', '200'));

    await act(async () => {
      await r.current.handleSave();
    });

    // c2 was untouched, so it is not rewritten.
    expect(ops.handleCategoryBudgetUpsert).toHaveBeenCalledTimes(1);
    expect(ops.handleCategoryBudgetUpsert).toHaveBeenCalledWith('c1', 200);
    expect(onClose).toHaveBeenCalled();
  });

  it('deletes a cap that was cleared', async () => {
    data.categoryBudgets = [budget('c1', 150)];
    const r = render();

    act(() => r.current.clearDraft('c1'));
    await act(async () => {
      await r.current.handleSave();
    });

    expect(ops.handleCategoryBudgetDelete).toHaveBeenCalledWith('c1');
    expect(ops.handleCategoryBudgetUpsert).not.toHaveBeenCalled();
  });

  it('does not delete a category that never had a cap', async () => {
    const r = render();

    act(() => r.current.clearDraft('c2'));
    await act(async () => {
      await r.current.handleSave();
    });

    expect(ops.handleCategoryBudgetDelete).not.toHaveBeenCalled();
  });

  it('closes without writing when nothing changed', async () => {
    data.categoryBudgets = [budget('c1', 150)];
    const r = render();

    await act(async () => {
      await r.current.handleSave();
    });

    expect(ops.handleCategoryBudgetUpsert).not.toHaveBeenCalled();
    expect(ops.handleCategoryBudgetDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('blocks the whole batch on one bad amount rather than half-applying it', async () => {
    const r = render();

    act(() => r.current.updateDraft('c1', '100'));
    act(() => r.current.updateDraft('c2', '0'));

    await act(async () => {
      await r.current.handleSave();
    });

    // The valid c1 cap must not be written while c2 is rejected.
    expect(ops.handleCategoryBudgetUpsert).not.toHaveBeenCalled();
    expect(r.current.error).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('names the offending categories in the error', async () => {
    const r = render();

    act(() => r.current.updateDraft('c1', '0'));
    act(() => r.current.updateDraft('c2', '0'));
    await act(async () => {
      await r.current.handleSave();
    });

    // The global i18n mock returns the bare key, so assert on what the hook
    // passes for interpolation rather than on rendered copy.
    expect(r.current.error).toBe('budget.categoryBudgets.invalidAmountFor');
    expect(mockT).toHaveBeenCalledWith(
      'budget.categoryBudgets.invalidAmountFor',
      { names: 'Zebra, Apple' },
    );
  });

  it('rejects an implausibly large cap', async () => {
    const r = render();

    act(() => r.current.updateDraft('c1', '99999999'));
    await act(async () => {
      await r.current.handleSave();
    });

    expect(r.current.error).toBeTruthy();
    expect(ops.handleCategoryBudgetUpsert).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the amount is edited', async () => {
    const r = render();

    act(() => r.current.updateDraft('c1', '0'));
    await act(async () => {
      await r.current.handleSave();
    });
    expect(r.current.error).toBeTruthy();

    act(() => r.current.updateDraft('c1', '50'));
    expect(r.current.error).toBeNull();
  });

  it('stays open when a write fails, so the drafts are not lost', async () => {
    // useBudgetOps raises its own error toast; this hook must not also close.
    ops.handleCategoryBudgetUpsert.mockRejectedValue(new Error('down'));
    const r = render();

    act(() => r.current.updateDraft('c1', '100'));
    await act(async () => {
      await r.current.handleSave();
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(r.current.isSaving).toBe(false);
    expect(r.current.drafts.c1).toContain('100');
  });
});
