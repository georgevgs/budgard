import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCategoryBudgetAlerts, type CategoryBudgetAlertInput } from '@/hooks/useCategoryBudgetAlerts';

const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const mockWarning = vi.fn();
vi.mock('@/lib/haptics', () => ({
  haptics: { warning: () => mockWarning(), success: vi.fn(), error: vi.fn() },
}));

const make = (
  spent: number,
  cap: number = 100,
): CategoryBudgetAlertInput[] => [
  { categoryId: 'c1', categoryName: 'Food', cap, spent },
];

describe('useCategoryBudgetAlerts', () => {
  it('does nothing when disabled', () => {
    renderHook(() =>
      useCategoryBudgetAlerts({
        alerts: make(150, 100),
        defaultCurrency: 'EUR',
        enabled: false,
      }),
    );

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not alert on first render (page-load guard)', () => {
    renderHook(() =>
      useCategoryBudgetAlerts({
        alerts: make(95, 100),
        defaultCurrency: 'EUR',
        enabled: true,
      }),
    );

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('fires warning toast when crossing 80% upward', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useCategoryBudgetAlerts({
          alerts: make(spent, 100),
          defaultCurrency: 'EUR',
          enabled: true,
        }),
      { initialProps: { spent: 50 } },
    );

    expect(mockToast).not.toHaveBeenCalled();

    rerender({ spent: 85 });
    expect(mockToast).toHaveBeenCalledOnce();
  });

  it('fires destructive toast when crossing 100%', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useCategoryBudgetAlerts({
          alerts: make(spent, 100),
          defaultCurrency: 'EUR',
          enabled: true,
        }),
      { initialProps: { spent: 90 } },
    );

    rerender({ spent: 110 });

    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('does not alert when spending decreases (e.g. expense deleted)', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useCategoryBudgetAlerts({
          alerts: make(spent, 100),
          defaultCurrency: 'EUR',
          enabled: true,
        }),
      { initialProps: { spent: 70 } },
    );

    rerender({ spent: 50 });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('forgets a category that disappears, so a re-added cap starts fresh', () => {
    // Kept state would carry prevSpent=50 across the gap, making the 85
    // reading look like a fresh upward crossing of 80% and firing a toast.
    // A re-added category is a first sighting: it records silently.
    const { rerender } = renderHook(
      ({ alerts }) =>
        useCategoryBudgetAlerts({
          alerts,
          defaultCurrency: 'EUR',
          enabled: true,
        }),
      { initialProps: { alerts: make(50, 100) } },
    );

    rerender({ alerts: [] });
    mockToast.mockClear();
    rerender({ alerts: make(85, 100) });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('resets when the cap changes', () => {
    const { rerender } = renderHook(
      ({ spent, cap }: { spent: number; cap: number }) =>
        useCategoryBudgetAlerts({
          alerts: make(spent, cap),
          defaultCurrency: 'EUR',
          enabled: true,
        }),
      { initialProps: { spent: 50, cap: 100 } },
    );

    rerender({ spent: 90, cap: 100 }); // crosses 80% — warning fires
    expect(mockToast).toHaveBeenCalledTimes(1);

    // Bumping the cap should reset state, so 90/200=45% is now under threshold.
    rerender({ spent: 90, cap: 200 });
    rerender({ spent: 170, cap: 200 }); // 85% — new warning
    expect(mockToast).toHaveBeenCalledTimes(2);
  });
});
