// Shared-mock suite for the dataOps hooks that were folded onto
// useMutationRunner. One mock setup, several hooks — they all depend on the
// same four modules.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Tag } from '@/types/Tag';
import type { Debt } from '@/types/Debt';

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: mockToast }) }));

vi.mock('@/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: 'u1' }),
}));

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

const svc = vi.hoisted(() => ({
  createDebt: vi.fn(),
  updateDebt: vi.fn(),
  archiveDebt: vi.fn(),
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  createNoSpendDay: vi.fn(),
  deleteNoSpendDay: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));
vi.mock('@/services/dataService', () => ({ dataService: svc }));

// Stateful setters. Rollback captures the previous list *inside* an updater,
// so a setter that never invokes updaters would fake every rollback.
const store = vi.hoisted(() => ({
  debts: [] as unknown[],
  templates: [] as unknown[],
  noSpendDays: [] as unknown[],
  tags: [] as unknown[],
  expenses: [] as unknown[],
}));

const mockRefreshExpenses = vi.hoisted(() => vi.fn());

const setterFor = (key: keyof typeof store) => (arg: unknown) => {
  if (typeof arg === 'function') {
    store[key] = (arg as (p: unknown[]) => unknown[])(store[key]);

    return;
  }
  store[key] = arg as unknown[];
};

vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true }),
  useDataActions: () => ({
    setDebts: setterFor('debts'),
    setTemplates: setterFor('templates'),
    setNoSpendDays: setterFor('noSpendDays'),
    setTags: setterFor('tags'),
    setExpenses: setterFor('expenses'),
    refreshExpenses: mockRefreshExpenses,
  }),
}));

import { useDebtOps } from '@/hooks/dataOps/useDebtOps';
import { useTemplateOps } from '@/hooks/dataOps/useTemplateOps';
import { useNoSpendOps } from '@/hooks/dataOps/useNoSpendOps';
import { useTagOps } from '@/hooks/dataOps/useTagOps';

beforeEach(() => {
  vi.clearAllMocks();
  store.debts = [];
  store.templates = [];
  store.noSpendDays = [];
  store.tags = [];
  store.expenses = [];
});

// --- Debts ---

describe('useDebtOps', () => {
  it('appends a created debt rather than prepending it', async () => {
    // The debts list reads oldest-first, unlike every other slice.
    store.debts = [{ id: 'existing' }];
    svc.createDebt.mockResolvedValue({ id: 'new' } as Debt);

    const ops = renderHook(() => useDebtOps()).result;
    await act(async () => {
      await ops.current.handleDebtSubmit({ name: 'Card' });
    });

    expect((store.debts as Debt[]).map((d) => d.id)).toEqual([
      'existing',
      'new',
    ]);
  });

  it('replaces in place on edit and returns the saved debt', async () => {
    store.debts = [{ id: 'd1', name: 'Old' }];
    svc.updateDebt.mockResolvedValue({ id: 'd1', name: 'New' } as Debt);

    const ops = renderHook(() => useDebtOps()).result;
    let returned: Debt | null = null;
    await act(async () => {
      returned = await ops.current.handleDebtSubmit({ name: 'New' }, 'd1');
    });

    expect((store.debts as Debt[])[0].name).toBe('New');
    expect(returned).toEqual({ id: 'd1', name: 'New' });
  });

  it('tags the Sentry operation by create vs update', async () => {
    svc.createDebt.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useDebtOps()).result;
    await act(async () => {
      await expect(ops.current.handleDebtSubmit({})).rejects.toThrow();
    });

    expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { operation: 'createDebt' },
    });
  });

  it('restores the debt when archiving fails', async () => {
    const before = [{ id: 'd1' }, { id: 'd2' }];
    store.debts = [...before];
    svc.archiveDebt.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useDebtOps()).result;
    await act(async () => {
      await expect(ops.current.handleDebtArchive('d1')).rejects.toThrow();
    });

    expect(store.debts).toEqual(before);
    expect(mockHaptics.warning).toHaveBeenCalled();
  });
});

// --- Templates ---

describe('useTemplateOps', () => {
  it('shows the template immediately then swaps in the saved row', async () => {
    svc.createTemplate.mockResolvedValue({ id: 'srv' });

    const ops = renderHook(() => useTemplateOps()).result;
    await act(async () => {
      await ops.current.handleTemplateCreate({ description: 'Coffee' });
    });

    expect(store.templates).toEqual([{ id: 'srv' }]);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
  });

  it('drops the optimistic template when the save fails', async () => {
    svc.createTemplate.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useTemplateOps()).result;
    await act(async () => {
      await expect(
        ops.current.handleTemplateCreate({ description: 'Coffee' }),
      ).rejects.toThrow();
    });

    expect(store.templates).toEqual([]);
  });

  it('restores the template when the delete fails', async () => {
    const before = [{ id: 't1' }];
    store.templates = [...before];
    svc.deleteTemplate.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useTemplateOps()).result;
    await act(async () => {
      await expect(ops.current.handleTemplateDelete('t1')).rejects.toThrow();
    });

    expect(store.templates).toEqual(before);
  });
});

// --- No-spend days ---

describe('useNoSpendOps', () => {
  it('claims a day optimistically and reconciles with the server row', async () => {
    svc.createNoSpendDay.mockResolvedValue({
      day: '2026-08-01',
      user_id: 'u1',
    });

    const ops = renderHook(() => useNoSpendOps()).result;
    await act(async () => {
      await ops.current.handleNoSpendClaim('2026-08-01');
    });

    expect(store.noSpendDays).toEqual([{ day: '2026-08-01', user_id: 'u1' }]);
  });

  it('keeps the optimistic row when the upsert reports a duplicate', async () => {
    // A day already claimed comes back null; the optimistic row is correct.
    svc.createNoSpendDay.mockResolvedValue(null);

    const ops = renderHook(() => useNoSpendOps()).result;
    await act(async () => {
      await ops.current.handleNoSpendClaim('2026-08-01');
    });

    expect(store.noSpendDays).toHaveLength(1);
    expect((store.noSpendDays as { day: string }[])[0].day).toBe('2026-08-01');
  });

  it('does not double-add a day already in the list', async () => {
    store.noSpendDays = [{ day: '2026-08-01', user_id: 'u1' }];
    svc.createNoSpendDay.mockResolvedValue(null);

    const ops = renderHook(() => useNoSpendOps()).result;
    await act(async () => {
      await ops.current.handleNoSpendClaim('2026-08-01');
    });

    expect(store.noSpendDays).toHaveLength(1);
  });

  it('un-claims with the selection haptic and restores on failure', async () => {
    const before = [{ day: '2026-08-01' }];
    store.noSpendDays = [...before];
    svc.deleteNoSpendDay.mockResolvedValue(undefined);

    const ops = renderHook(() => useNoSpendOps()).result;
    await act(async () => {
      await ops.current.handleNoSpendUndo('2026-08-01');
    });

    expect(store.noSpendDays).toEqual([]);
    expect(mockHaptics.selection).toHaveBeenCalled();
    expect(mockHaptics.success).not.toHaveBeenCalled();

    store.noSpendDays = [...before];
    svc.deleteNoSpendDay.mockRejectedValue(new Error('down'));
    await act(async () => {
      await expect(
        ops.current.handleNoSpendUndo('2026-08-01'),
      ).rejects.toThrow();
    });
    expect(store.noSpendDays).toEqual(before);
  });
});

// --- Tags ---

describe('useTagOps', () => {
  it('keeps the tag list sorted by name and returns the saved tag', async () => {
    store.tags = [{ id: 'a', name: 'Apple' }, { id: 'z', name: 'Zebra' }];
    svc.createTag.mockResolvedValue({ id: 'srv', name: 'Mango' } as Tag);

    const ops = renderHook(() => useTagOps()).result;
    let returned: Tag | undefined;
    await act(async () => {
      returned = await ops.current.handleTagCreate('Mango', '#fff');
    });

    expect((store.tags as Tag[]).map((t) => t.name)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);
    expect(returned?.id).toBe('srv');
  });

  it('removes the optimistic tag when the create fails', async () => {
    svc.createTag.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useTagOps()).result;
    await act(async () => {
      await expect(ops.current.handleTagCreate('Mango', '#fff')).rejects.toThrow();
    });

    expect(store.tags).toEqual([]);
  });

  it('renames the tag across expense rows too', async () => {
    store.tags = [{ id: 't1', name: 'Old' }];
    store.expenses = [{ id: 'e1', tag_id: 't1', tag: { id: 't1', name: 'Old' } }];
    svc.updateTag.mockResolvedValue(undefined);

    const ops = renderHook(() => useTagOps()).result;
    await act(async () => {
      await ops.current.handleTagUpdate('t1', 'New');
    });

    expect((store.tags as Tag[])[0].name).toBe('New');
    expect((store.expenses as { tag: Tag }[])[0].tag.name).toBe('New');
  });

  it('resyncs expenses from the server when a tag write rolls back', async () => {
    // The embedded rows cannot be un-swept by hand, so a failed tag write
    // restores the tag list and refetches the expenses.
    const beforeTags = [{ id: 't1', name: 'Old' }];
    store.tags = [...beforeTags];
    store.expenses = [{ id: 'e1', tag_id: 't1', tag: { id: 't1', name: 'Old' } }];
    svc.updateTag.mockRejectedValue(new Error('down'));

    const ops = renderHook(() => useTagOps()).result;
    await act(async () => {
      await expect(ops.current.handleTagUpdate('t1', 'New')).rejects.toThrow();
    });

    expect(store.tags).toEqual(beforeTags);
    expect(mockRefreshExpenses).toHaveBeenCalled();
  });

  it('clears the tag off expenses when it is deleted', async () => {
    store.tags = [{ id: 't1', name: 'Gone' }];
    store.expenses = [{ id: 'e1', tag_id: 't1', tag: { id: 't1', name: 'Gone' } }];
    svc.deleteTag.mockResolvedValue(undefined);

    const ops = renderHook(() => useTagOps()).result;
    await act(async () => {
      await ops.current.handleTagDelete('t1');
    });

    expect(store.tags).toEqual([]);
    const expense = (store.expenses as { tag_id?: string; tag?: Tag }[])[0];
    expect(expense.tag_id).toBeUndefined();
    expect(expense.tag).toBeUndefined();
  });
});
