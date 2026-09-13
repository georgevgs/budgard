import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlanTimeline } from '@/pages/plan/components/PlanTimeline';
import { buildMoneyTimeline } from '@/pages/plan/utils/moneyTimeline';
import type { RecurringExpense } from '@/types/RecurringExpense';

const NOW = new Date(2026, 8, 10, 12); // 10 Sep 2026, local

describe('PlanTimeline', () => {
  it('marks the shown window and offers the other one', () => {
    const onRangeChange = vi.fn();
    renderTimeline({ onRangeChange });

    expect(screen.getByText('plan.timeline.range.month')).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByText('plan.timeline.range.days'));

    expect(onRangeChange).toHaveBeenCalledWith('days');
  });

  it('picks the summary that matches which flows the window holds', () => {
    // The t() mock echoes the key, so the assertion is on which sentence the
    // window asks for — the branch that decides whether a net is quoted at all.
    const rent = bill({ id: 'rent', amount: 800, start_date: '2026-09-15' });
    const pay = bill({ id: 'pay', amount: 2000, start_date: '2026-09-28' });

    const { unmount } = renderTimeline({ expenses: [rent], incomes: [pay] });
    expect(
      screen.getByText('plan.timeline.summary.month.both'),
    ).toBeInTheDocument();
    unmount();

    renderTimeline({ expenses: [rent] });
    expect(
      screen.getByText('plan.timeline.summary.month.expensesOnly'),
    ).toBeInTheDocument();
  });

  it('reads a quiet month as good news and offers the wider window', () => {
    const onRangeChange = vi.fn();
    // Scheduled, but not again before the month closes.
    renderTimeline({
      expenses: [bill({ id: 'rent', amount: 800, start_date: '2026-10-15' })],
      onRangeChange,
    });

    expect(
      screen.getByText('plan.timeline.quiet.monthTitle'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/plan\.timeline\.quiet\.monthAction/));

    expect(onRangeChange).toHaveBeenCalledWith('days');
  });

  it('asks for a first schedule when there are none at all', () => {
    renderTimeline({ hasSchedules: false });

    expect(screen.getByText('plan.timeline.emptyTitle')).toBeInTheDocument();
    expect(
      screen.queryByText('plan.timeline.quiet.monthTitle'),
    ).not.toBeInTheDocument();
  });
});

type Options = {
  expenses?: RecurringExpense[];
  incomes?: RecurringExpense[];
  hasSchedules?: boolean;
  onRangeChange?: (range: 'month' | 'days') => void;
};

const renderTimeline = (options: Options = {}) => {
  const expenses = options.expenses ?? [];
  const incomes = options.incomes ?? [];
  const timeline = buildMoneyTimeline(expenses, incomes, NOW, {
    range: 'month',
    withinDays: 30,
    limit: 8,
  });

  return render(
    <MemoryRouter>
      <PlanTimeline
        timeline={timeline}
        hasSchedules={options.hasSchedules ?? true}
        currency="EUR"
        onRangeChange={options.onRangeChange ?? vi.fn()}
      />
    </MemoryRouter>,
  );
};

const bill = (overrides: Partial<RecurringExpense>): RecurringExpense => ({
  id: 'schedule',
  user_id: 'user-1',
  amount: 25,
  description: 'Planned payment',
  frequency: 'monthly',
  start_date: '2026-09-15',
  created_at: '2026-08-01T00:00:00Z',
  active: true,
  type: 'expense',
  ...overrides,
});
