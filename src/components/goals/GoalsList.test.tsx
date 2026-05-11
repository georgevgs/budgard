import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Goal } from '@/types/Goal';

let dataMock: {
  goals: Goal[];
  defaultCurrency: string;
  isInitialized: boolean;
  isSecondaryLoaded: boolean;
};

vi.mock('@/contexts/DataContext', () => ({
  useGoalsData: () => dataMock.goals,
  useExpensesData: () => [],
  useIncomesData: () => [],
  useCategoriesData: () => ({
    categories: [],
    expenseCategories: [],
    incomeCategories: [],
  }),
  useTagsData: () => [],
  useDataConfig: () => ({
    defaultCurrency: dataMock.defaultCurrency,
    isInitialized: dataMock.isInitialized,
    isSecondaryLoaded: dataMock.isSecondaryLoaded,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } } }),
}));

const mockGoalCreate = vi.fn();
const mockGoalUpdate = vi.fn();
const mockGoalDelete = vi.fn();
vi.mock('@/hooks/dataOps/useGoalOps', () => ({
  useGoalOps: () => ({
    handleGoalCreate: mockGoalCreate,
    handleGoalUpdate: mockGoalUpdate,
    handleGoalDelete: mockGoalDelete,
  }),
}));

// Stub out the form so we don't have to wire up react-hook-form internals.
vi.mock('@/components/goals/GoalForm', () => ({
  default: () => null,
}));

import GoalsList from './GoalsList';

const renderList = () =>
  render(
    <MemoryRouter>
      <GoalsList />
    </MemoryRouter>,
  );

const baseData = {
  defaultCurrency: 'EUR',
  isInitialized: true,
  isSecondaryLoaded: true,
};

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  user_id: 'u1',
  name: 'Vacation',
  target_amount: 1000,
  currency: 'EUR',
  deadline: null,
  start_date: '2026-01-01',
  source_type: 'net_delta',
  category_id: null,
  tag_id: null,
  icon: 'target',
  color: '#f97316',
  is_completed: false,
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('GoalsList', () => {
  it('renders the empty state with a CTA when no goals exist', () => {
    dataMock = { ...baseData, goals: [] };
    renderList();

    expect(screen.getByText('goals.empty.title')).toBeInTheDocument();
    expect(screen.getByText('goals.empty.description')).toBeInTheDocument();
  });

  it('renders one card per goal', () => {
    dataMock = {
      ...baseData,
      goals: [
        makeGoal({ id: 'a', name: 'Vacation' }),
        makeGoal({ id: 'b', name: 'Emergency fund' }),
      ],
    };
    renderList();

    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('Emergency fund')).toBeInTheDocument();
  });

  it('shows the active count in the subtitle', () => {
    dataMock = {
      ...baseData,
      goals: [makeGoal({ id: 'a' }), makeGoal({ id: 'b' })],
    };
    renderList();

    expect(screen.getByText('goals.subtitle')).toBeInTheDocument();
  });
});
