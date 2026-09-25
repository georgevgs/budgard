import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActivityFeed } from '@/pages/activity/components/ActivityFeed';

const renderEmptyFeed = (hasPeriodRows: boolean) => {
  const onShowAll = vi.fn();
  render(
    <ActivityFeed
      transactions={[]}
      currency="EUR"
      isHistoryPending={false}
      hasTransactions
      hasPeriodRows={hasPeriodRows}
      onShowAll={onShowAll}
      onExpenseEdit={vi.fn()}
      onExpenseDelete={vi.fn()}
      onSaveAsTemplate={vi.fn()}
      onIncomeEdit={vi.fn()}
      onIncomeDelete={vi.fn()}
    />,
  );

  return onShowAll;
};

describe('ActivityFeed empty states', () => {
  it('offers all activity when the chosen period has no transactions', () => {
    const onShowAll = renderEmptyFeed(false);

    expect(screen.getByText('activity.emptyPeriodTitle')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'activity.showAll' }));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it('explains when filters produce no matches', () => {
    renderEmptyFeed(true);

    expect(screen.getByText('activity.noMatchesTitle')).toBeVisible();
    expect(screen.queryByText('activity.emptyTitle')).toBeNull();
  });
});
