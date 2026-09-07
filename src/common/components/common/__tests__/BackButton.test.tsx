import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { BackButton } from '@/common/components/common/BackButton';

const Harness = () => {
  const { pathname } = useLocation();

  return (
    <>
      <BackButton />
      <output>{pathname}</output>
    </>
  );
};

describe('BackButton direct-entry fallback', () => {
  afterEach(() => window.history.replaceState(null, ''));

  it('uses the actual previous route when the transaction was opened from Today', () => {
    window.history.replaceState({ idx: 1 }, '');
    render(
      <MemoryRouter initialEntries={['/today', '/t/expense-1']}>
        <Harness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));

    expect(screen.getByRole('status')).toHaveTextContent('/today');
  });

  it.each([
    ['/t/expense-1', '/activity'],
    ['/review', '/activity'],
    ['/trends/explore', '/trends'],
    ['/networth', '/plan'],
    ['/recurring', '/plan'],
    ['/settings/appearance', '/settings'],
    ['/settings', '/today'],
  ])(
    'returns from %s to %s when there is no previous app entry',
    (from, to) => {
      window.history.replaceState({ idx: 0 }, '');
      render(
        <MemoryRouter initialEntries={[from]}>
          <Harness />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'common.back' }));

      expect(screen.getByRole('status')).toHaveTextContent(to);
    },
  );
});
