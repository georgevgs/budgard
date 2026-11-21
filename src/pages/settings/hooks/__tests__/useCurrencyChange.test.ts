import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({ defaultCurrency: 'EUR' }),
}));

const mockHandleCurrencyUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/dataOps/useSettingsOps', () => ({
  useSettingsOps: () => ({ handleCurrencyUpdate: mockHandleCurrencyUpdate }),
}));

import { useCurrencyChange } from '@/pages/settings/hooks/useCurrencyChange';

const confirmCurrency = async (
  result: { current: ReturnType<typeof useCurrencyChange> },
  currency: string,
): Promise<void> => {
  act(() => {
    result.current.request(currency);
  });
  await act(async () => {
    await result.current.confirm();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCurrencyChange', () => {
  it('settles quietly when the write fails, the runner already told the user', async () => {
    mockHandleCurrencyUpdate.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCurrencyChange());

    await confirmCurrency(result, 'USD');

    expect(mockHandleCurrencyUpdate).toHaveBeenCalledWith('USD');
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('ends not updating when the write lands', async () => {
    mockHandleCurrencyUpdate.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCurrencyChange());

    await confirmCurrency(result, 'USD');

    expect(mockHandleCurrencyUpdate).toHaveBeenCalledWith('USD');
    expect(result.current.isUpdating).toBe(false);
  });
});
