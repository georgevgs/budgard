import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  isSecondaryLoaded: false,
  isComputing: false,
  staleCurrencies: [] as string[],
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({
    defaultCurrency: 'EUR',
    isSecondaryLoaded: state.isSecondaryLoaded,
  }),
}));

vi.mock('@/common/hooks/useNetWorth', () => ({
  useNetWorth: () => ({
    summary: { total: 42000, staleCurrencies: state.staleCurrencies },
    isComputing: state.isComputing,
  }),
}));

import { NetWorthTile } from '@/pages/today/components/tiles/NetWorthTile';

const renderTile = () =>
  render(
    <MemoryRouter>
      <NetWorthTile />
    </MemoryRouter>,
  );

describe('NetWorthTile', () => {
  beforeEach(() => {
    state.isSecondaryLoaded = false;
    state.isComputing = false;
    state.staleCurrencies = [];
  });

  it('does not present a zero-value answer before deferred data arrives', () => {
    renderTile();

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('keeps net worth unknown while exchange rates are being computed', () => {
    state.isSecondaryLoaded = true;
    state.isComputing = true;

    renderTile();

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('does not show a guessed total when an exchange rate failed', () => {
    state.isSecondaryLoaded = true;
    state.staleCurrencies = ['JPY'];

    renderTile();

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
