import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({
    defaultCurrency: 'EUR',
    isSecondaryLoaded: false,
  }),
}));

vi.mock('@/common/hooks/useDebts', () => ({
  useDebts: () => ({
    summary: { totalBalance: 1250, activeCount: 2 },
  }),
}));

import { DebtsTile } from '@/pages/today/components/tiles/DebtsTile';

describe('DebtsTile', () => {
  it('does not present zero-value answers before deferred data arrives', () => {
    render(
      <MemoryRouter>
        <DebtsTile />
      </MemoryRouter>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });
});
