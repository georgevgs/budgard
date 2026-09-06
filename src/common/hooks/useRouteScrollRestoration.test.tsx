import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouteScrollRestoration } from '@/common/hooks/useRouteScrollRestoration';

const RouteHarness = () => {
  const navigate = useNavigate();
  useRouteScrollRestoration();

  return (
    <>
      <button type="button" onClick={() => navigate('/expenses')}>
        expenses
      </button>
      <button type="button" onClick={() => navigate('/income')}>
        income
      </button>
    </>
  );
};

describe('useRouteScrollRestoration', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores an independent scroll position for each route', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <RouteHarness />
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    window.scrollY = 420;
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'income' }));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    window.scrollY = 180;
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('button', { name: 'expenses' }));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 420);
  });

  it('keeps the last scrolled position when the departing page shrinks during navigation', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <RouteHarness />
      </MemoryRouter>,
    );
    window.scrollY = 1200;
    fireEvent.scroll(window);

    // Hiding the departing tab can clamp scrollY before layout-effect cleanup.
    window.scrollY = 0;
    fireEvent.click(screen.getByRole('button', { name: 'income' }));
    fireEvent.click(screen.getByRole('button', { name: 'expenses' }));

    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 1200);
  });
});
