import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBudgetAlerts } from './useBudgetAlerts';

// Mock the toast module
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock haptics
const mockWarning = vi.fn();
vi.mock('@/lib/haptics', () => ({
  haptics: { warning: () => mockWarning(), success: vi.fn(), error: vi.fn() },
}));

describe('useBudgetAlerts', () => {
  it('does nothing when no budget is set', () => {
    renderHook(() =>
      useBudgetAlerts({ monthlyBudget: null, monthlySpent: 500, defaultCurrency: 'EUR' }),
    );
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does nothing when budget is zero', () => {
    renderHook(() => useBudgetAlerts({ monthlyBudget: 0, monthlySpent: 500, defaultCurrency: 'EUR' }));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does nothing when spent is zero', () => {
    renderHook(() => useBudgetAlerts({ monthlyBudget: 1000, monthlySpent: 0, defaultCurrency: 'EUR' }));
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('does not alert on first render (prevents page-load toasts)', () => {
    renderHook(() =>
      useBudgetAlerts({ monthlyBudget: 1000, monthlySpent: 900, defaultCurrency: 'EUR' }),
    );
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows warning toast when crossing 80% threshold upward', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useBudgetAlerts({ monthlyBudget: 1000, monthlySpent: spent, defaultCurrency: 'EUR' }),
      { initialProps: { spent: 700 } },
    );

    // First render records initial spent, no alert
    expect(mockToast).not.toHaveBeenCalled();

    // Cross 80%
    rerender({ spent: 850 });
    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockWarning).toHaveBeenCalled();
  });

  it('shows exceeded toast when crossing 100% threshold', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useBudgetAlerts({ monthlyBudget: 1000, monthlySpent: spent, defaultCurrency: 'EUR' }),
      { initialProps: { spent: 900 } },
    );

    rerender({ spent: 1050 });
    expect(mockToast).toHaveBeenCalledOnce();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('does not re-alert after already showing warning', () => {
    const { rerender } = renderHook(
      ({ spent }) =>
        useBudgetAlerts({ monthlyBudget: 1000, monthlySpent: spent, defaultCurrency: 'EUR' }),
      { initialProps: { spent: 700 } },
    );

    rerender({ spent: 850 }); // triggers warning
    rerender({ spent: 890 }); // still above 80% but already shown

    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it('resets alerts when budget amount changes', () => {
    const { rerender } = renderHook(
      ({ budget, spent }: { budget: number; spent: number }) =>
        useBudgetAlerts({ monthlyBudget: budget, monthlySpent: spent, defaultCurrency: 'EUR' }),
      { initialProps: { budget: 1000, spent: 700 } },
    );

    rerender({ budget: 1000, spent: 850 }); // triggers warning
    expect(mockToast).toHaveBeenCalledTimes(1);

    // Change budget — resets alert state
    rerender({ budget: 2000, spent: 850 });
    // Now 850/2000 = 42.5% — below threshold, no new alert
    rerender({ budget: 2000, spent: 1700 }); // 85% — new warning
    expect(mockToast).toHaveBeenCalledTimes(2);
  });
});
