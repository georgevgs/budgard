import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Debt } from '@/types/Debt';

const mockHandleDebtArchive = vi.fn();
vi.mock('@/hooks/dataOps/useDebtOps', () => ({
  useDebtOps: () => ({ handleDebtArchive: mockHandleDebtArchive }),
}));

const mockHandleExpenseDelete = vi.fn();
vi.mock('@/hooks/dataOps/useExpenseOps', () => ({
  useExpenseOps: () => ({ handleExpenseDelete: mockHandleExpenseDelete }),
}));

import { useDebtDetailActions } from '@/hooks/debts/useDebtDetailActions';

const makeDebt = (overrides: Partial<Debt> = {}): Debt =>
  ({ id: 'd1', name: 'Visa Card', ...overrides }) as Debt;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handlePaymentDeleteConfirm', () => {
  it('passes the debt id along so the balance refreshes', async () => {
    mockHandleExpenseDelete.mockResolvedValue(undefined);
    const removePayment = vi.fn();
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useDebtDetailActions({ debt: makeDebt(), onClose, removePayment }),
    );

    act(() => {
      result.current.setPaymentToDelete('p1');
    });
    await act(async () => {
      await result.current.handlePaymentDeleteConfirm();
    });

    expect(mockHandleExpenseDelete).toHaveBeenCalledWith('p1', 'd1');
    expect(removePayment).toHaveBeenCalledWith('p1');
  });

  it('does nothing when no payment is marked for deletion', async () => {
    const { result } = renderHook(() =>
      useDebtDetailActions({
        debt: makeDebt(),
        onClose: vi.fn(),
        removePayment: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handlePaymentDeleteConfirm();
    });

    expect(mockHandleExpenseDelete).not.toHaveBeenCalled();
  });
});
