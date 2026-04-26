import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RecurringLoadingState from './RecurringLoading';

describe('RecurringLoading', () => {
  it('renders three skeleton cards', () => {
    const { container } = render(<RecurringLoadingState />);

    const cards = container.querySelectorAll('.rounded-2xl.border');
    expect(cards.length).toBe(3);
  });
});
