// Rollbacks exercised against the real data reducer rather than the eager
// setters the other dataOps suites use.
//
// The difference matters. The data layer is a useReducer, and React runs a
// reducer's updaters lazily at render time — so a rollback that captures the
// "previous" list by value when the optimistic pass is built captures the
// empty placeholder, not the list. The eager test setters run the updater
// immediately and hide that; this suite does not. A failed tag rename wiped
// every tag this way.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  dataReducer,
  EMPTY_DATA,
  createSetters,
  type DataState,
} from '@/common/hooks/data/dataReducer';
import type { Goal } from '@/types/Goal';
import type { Tag } from '@/types/Tag';

vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => ({ activeOwnerId: 'u1' }),
}));
vi.mock('@/common/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => vi.fn(),
}));
vi.mock('@/config/sentry', () => ({ captureException: vi.fn() }));

const svc = vi.hoisted(() => ({
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  deleteGoal: vi.fn(),
  mergeCategory: vi.fn(),
}));
vi.mock('@/common/api/dataService', () => ({ dataService: svc }));

// The reducer lives in a wrapper, as it does in the real provider, and its
// setters reach the hooks under test through context. The latest committed
// state is copied out in an effect so the assertions can read it.
const harness = await vi.hoisted(async () => {
  const { createContext } = await import('react');

  return {
    SettersContext: createContext<object>({}),
    state: null as unknown,
  };
});

vi.mock('@/common/contexts/DataContext', async () => {
  const { useContext } = await import('react');

  return {
    useDataActions: () => ({
      ...useContext(harness.SettersContext),
      refreshExpenses: () => Promise.resolve(),
      refreshIncomes: () => Promise.resolve(),
    }),
    useDataConfig: () => ({ isInitialized: true }),
  };
});

import { useTagOps } from '@/common/hooks/dataOps/useTagOps';
import { useGoalOps } from '@/common/hooks/dataOps/useGoalOps';
import { useCategoryOps } from '@/common/hooks/dataOps/useCategoryOps';
import { useDataActions } from '@/common/contexts/DataContext';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';

const TAGS: Tag[] = [
  { id: 't1', user_id: 'u1', name: 'Alpha', color: '#000', created_at: '' },
  { id: 't2', user_id: 'u1', name: 'Beta', color: '#000', created_at: '' },
];

const GOALS = [{ id: 'g1' }, { id: 'g2' }] as Goal[];

const FOOD = { id: 'food', name: 'Food' } as Category;
const GROCERIES = { id: 'groceries', name: 'Groceries' } as Category;
const LUNCH = {
  id: 'lunch',
  category_id: 'food',
  category: FOOD,
} as unknown as Expense;

const INITIAL: DataState = {
  ...EMPTY_DATA,
  tags: TAGS,
  goals: GOALS,
  categories: [FOOD, GROCERIES],
  expenses: [LUNCH],
};

const DataHarness = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(dataReducer, INITIAL);
  const setters = useMemo(() => createSetters(dispatch), []);

  useEffect(() => {
    harness.state = state;
  }, [state]);

  return (
    <harness.SettersContext.Provider value={setters}>
      {children}
    </harness.SettersContext.Provider>
  );
};

const renderOps = () =>
  renderHook(
    () => ({
      ...useTagOps(),
      ...useGoalOps(),
      ...useCategoryOps(),
      actions: useDataActions(),
    }),
    {
      wrapper: DataHarness,
    },
  );

const currentState = (): DataState => harness.state as DataState;

const failSoon = () =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error('network')), 5);
  });

// Starts the write in one act so the optimistic dispatch renders — as it
// would long before any real network reply — then lets it fail in another.
const runAndFail = async (start: () => Promise<unknown>): Promise<void> => {
  let pending: Promise<unknown> = Promise.resolve();
  act(() => {
    pending = start().catch(() => undefined);
  });
  await act(async () => {
    await pending;
  });
};

describe('rollback against the real reducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('puts every tag back after a failed rename', async () => {
    svc.updateTag.mockImplementation(failSoon);
    const { result } = renderOps();

    await runAndFail(() => result.current.handleTagUpdate('t1', 'Zeta'));

    expect(currentState().tags).toEqual(TAGS);
  });

  it('puts every tag back after a failed delete', async () => {
    svc.deleteTag.mockImplementation(failSoon);
    const { result } = renderOps();

    await runAndFail(() => result.current.handleTagDelete('t1'));

    expect(currentState().tags).toEqual(TAGS);
  });

  it('puts the goal back after a failed delete', async () => {
    svc.deleteGoal.mockImplementation(failSoon);
    const { result } = renderOps();

    await runAndFail(() => result.current.handleGoalDelete('g1'));

    expect(currentState().goals).toEqual(GOALS);
  });

  // Undo used to restore a snapshot of the whole list, which also undid every
  // write that overlapped: delete two goals, have the first fail, and the
  // second — deleted on the server — came back.
  it('undoes only its own delete when two overlap', async () => {
    svc.deleteGoal.mockImplementation((id: string) => {
      if (id === 'g1') {
        return failSoon();
      }

      return Promise.resolve();
    });
    const { result } = renderOps();

    let pending: Promise<unknown>[] = [];
    act(() => {
      pending = [
        result.current.handleGoalDelete('g1').catch(() => undefined),
        result.current.handleGoalDelete('g2').catch(() => undefined),
      ];
    });
    await act(async () => {
      await Promise.all(pending);
    });

    expect(currentState().goals).toEqual([GOALS[0]]);
  });

  // A failed merge used to restore snapshots of every slice it touched, so an
  // expense logged while it was in flight vanished with the undo.
  it('undoes a failed merge without losing an expense logged meanwhile', async () => {
    svc.mergeCategory.mockImplementation(failSoon);
    const { result } = renderOps();
    const coffee = { id: 'coffee', category_id: null } as unknown as Expense;

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current
        .handleCategoryMerge('food', GROCERIES)
        .catch(() => undefined);
    });
    act(() => {
      result.current.actions.setExpenses((prev) => [coffee, ...prev]);
    });
    await act(async () => {
      await pending;
    });

    expect(currentState().expenses).toEqual([coffee, LUNCH]);
    expect(currentState().categories.map((c) => c.id)).toEqual([
      'food',
      'groceries',
    ]);
  });
});
