import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TodayAmount from '@/components/today/TodayAmount';

// The count-up would otherwise settle over animation frames the test can't see.
vi.mock('@/hooks/useAnimatedNumber', () => ({
  useAnimatedNumber: (target: number) => target,
}));

describe('TodayAmount', () => {
  it('shows headroom without a sign', () => {
    render(<TodayAmount amount={412.5} currency="EUR" />);

    expect(screen.getByText('412,50€')).toBeInTheDocument();
  });

  it('marks an overspend with a typographic minus, not a hyphen', () => {
    render(<TodayAmount amount={-120} currency="EUR" />);

    // U+2212, matching every other signed amount in the app.
    expect(screen.getByText('−120,00€')).toBeInTheDocument();
  });

  it('does not render the magnitude twice for a negative amount', () => {
    render(<TodayAmount amount={-120} currency="EUR" />);

    expect(screen.queryByText('120,00€')).not.toBeInTheDocument();
  });

  it('leaves zero unsigned', () => {
    render(<TodayAmount amount={0} currency="EUR" />);

    expect(screen.getByText('0,00€')).toBeInTheDocument();
  });
});
