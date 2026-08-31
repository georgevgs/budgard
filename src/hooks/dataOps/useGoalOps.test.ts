import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Goal } from '@/types/Goal';

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
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));
vi.mock('@/services/dataService', () => ({ dataService: svc }));

// A stateful stand-in for React's setter: rollback logic captures the previous
// list *inside* an updater, so a mock that never invokes updaters would make
// every rollback look like it restored an empty list.
const store = vi.hoisted(() => ({ goals: [] as unknown[] }));
const mockSetGoals = vi.hoisted(() =>
  vi.fn((arg: unknown) => {
    if (typeof arg === 'function') {
      store.goals = (arg as (p: unknown[]) => unknown[])(store.goals);

      return;
    }
    store.goals = arg as unknown[];
  }),
);
vi.mock('@/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true }),
  useDataActions: () => ({ setGoals: mockSetGoals }),
}));

import { useGoalOps } from '@/hooks/dataOps/useGoalOps';

// --- Helpers ---

const goal = (over: Partial<Goal> = {}): Goal =>
  ({ id: 'g1', name: 'Trip', is_completed: false, ...over }) as Goal;

// The list as the user would see it after the mutation settled.
const finalState = (): Goal[] => store.goals as Goal[];

const startWith = (items: Goal[]): Goal[] => {
  store.goals = items;

  return items;
};

const renderOps = () => renderHook(() => useGoalOps()).result;

beforeEach(() => {
  vi.clearAllMocks();
  store.goals = [];
});

describe('useGoalOps create', () => {
  it('shows the goal immediately and swaps in the saved row', async () => {
    svc.createGoal.mockResolvedValue(goal({ id: 'server-1', name: 'Trip' }));

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleGoalCreate({ name: 'Trip' });
    });

    const state = finalState();
    expect(state).toHaveLength(1);
    // The temp row is gone — replaced by the server's, not stacked on top.
    expect(state[0].id).toBe('server-1');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
  });

  it('removes the optimistic goal when the create fails', async () => {
    svc.createGoal.mockRejectedValue(new Error('down'));

    const ops = renderOps();
    await act(async () => {
      await expect(ops.current.handleGoalCreate({ name: 'Trip' })).rejects.toThrow();
    });

    expect(finalState()).toEqual([]);
    expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { operation: 'createGoal' },
    });
    expect(mockShowErrorToast).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
    );
  });
});

describe('useGoalOps update', () => {
  it('patches in place then reconciles with the server row', async () => {
    svc.updateGoal.mockResolvedValue(goal({ id: 'g1', name: 'Server name' }));
    startWith([goal({ id: 'g1', name: 'Old' })]);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleGoalUpdate('g1', { name: 'New name' });
    });

    expect(finalState()[0].name).toBe('Server name');
  });

  it('restores the previous list when the update fails', async () => {
    svc.updateGoal.mockRejectedValue(new Error('down'));
    const before = startWith([goal({ id: 'g1', name: 'Old' })]);

    const ops = renderOps();
    await act(async () => {
      await expect(
        ops.current.handleGoalUpdate('g1', { name: 'New' }),
      ).rejects.toThrow();
    });

    expect(finalState()).toEqual(before);
  });
});

describe('useGoalOps delete', () => {
  it('removes the goal and warns before doing it', async () => {
    svc.deleteGoal.mockResolvedValue(undefined);
    startWith([goal({ id: 'g1' }), goal({ id: 'g2' })]);

    const ops = renderOps();
    await act(async () => {
      await ops.current.handleGoalDelete('g1');
    });

    expect(mockHaptics.warning).toHaveBeenCalled();
    expect(finalState()).toEqual([goal({ id: 'g2' })]);
  });

  it('puts the goal back when the delete fails', async () => {
    svc.deleteGoal.mockRejectedValue(new Error('down'));
    const before = [goal({ id: 'g1' }), goal({ id: 'g2' })];
    startWith([...before]);

    const ops = renderOps();
    await act(async () => {
      await expect(ops.current.handleGoalDelete('g1')).rejects.toThrow();
    });

    expect(finalState()).toEqual(before);
    expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { operation: 'deleteGoal' },
    });
  });
});
