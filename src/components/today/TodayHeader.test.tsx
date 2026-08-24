import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TodayHeader from '@/components/today/TodayHeader';

vi.mock('@/components/layout/ProfileMenu', () => ({
  default: () => null,
}));

const HeaderHarness = () => {
  const [isArranging, setArranging] = useState(true);

  return (
    <TodayHeader
      greeting="morning"
      dateLabel="Monday, 25 August"
      isArranging={isArranging}
      onArrange={() => setArranging(true)}
      onDone={() => setArranging(false)}
    />
  );
};

describe('TodayHeader Arrange flow', () => {
  it('announces the mode without decorating Done and restores trigger focus', async () => {
    render(<HeaderHarness />);
    const done = screen.getByRole('button', { name: 'today.arrange.done' });
    const heading = screen.getByRole('heading', {
      name: 'today.arrange.title',
    });

    expect(heading).toHaveFocus();
    expect(done).not.toHaveFocus();
    expect(done.parentElement).toHaveClass('sticky');
    fireEvent.click(done);

    const trigger = screen.getByRole('button', {
      name: 'today.arrange.open',
    });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveClass('h-11', 'w-11');
  });
});
