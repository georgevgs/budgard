import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AnalyticsLoadingState from './AnalyticsLoading';

describe('AnalyticsLoading', () => {
  it('renders four category breakdown skeleton rows', () => {
    const { container } = render(<AnalyticsLoadingState />);

    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(4);
  });

  it('renders the month snapshot card', () => {
    const { container } = render(<AnalyticsLoadingState />);

    expect(container.querySelector('.rounded-2xl.border')).not.toBeNull();
  });
});
